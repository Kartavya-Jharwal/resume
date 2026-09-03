/** Post-render PDF checks for Chromium and WeasyPrint export paths. */

import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

export const A4_MEDIA_BOX = { width: 595.276, height: 841.89 };

function pdfSearchCorpus(bytes) {
  const latin1 = bytes.toString('latin1');
  const chunks = [latin1];
  let cursor = 0;
  while (true) {
    const streamAt = bytes.indexOf(Buffer.from('stream'), cursor);
    if (streamAt < 0) break;
    const endAt = bytes.indexOf(Buffer.from('endstream'), streamAt);
    if (endAt < 0) break;
    let payload = bytes.subarray(streamAt + 6, endAt);
    if (payload[0] === 0x0d && payload[1] === 0x0a) payload = payload.subarray(2);
    else if (payload[0] === 0x0a) payload = payload.subarray(1);
    try {
      chunks.push(inflateSync(payload).toString('latin1'));
    } catch {
      // not a flate stream
    }
    cursor = endAt + 9;
  }
  return chunks.join('\n');
}

function detectStructure(source, header) {
  const versionMatch = header.match(/%PDF-(\d\.\d)/);
  return {
    pdfVersion: versionMatch ? versionMatch[1] : null,
    tagged: /\/MarkInfo\b/.test(source) || /\/StructTreeRoot\b/.test(source) || /\/Marked\s+true/.test(source),
    structTree: /\/StructTreeRoot\b/.test(source),
    lang: /\/Lang\b/.test(source),
    xmp: /http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#/.test(source) || /\/Metadata\b/.test(source),
    outlines: /\/Outlines\b/.test(source),
    embeddedTtf: /\/FontFile2\b/.test(source) || /\/CIDFontType2\b/.test(source),
    type3: /\/Subtype\s*\/Type3\b/.test(source),
    images: /\/Subtype\s*\/Image\b/.test(source),
    pdfUa: /pdfuaid:part|PDF\/UA/i.test(source),
    pdfA: /pdfaid:part|PDF\/A/i.test(source)
  };
}

export async function verifyPdf(path, options = {}) {
  const {
    label = path,
    expectedPageCount = null,
    expectedTitle = '',
    requireTitle = true,
    requireEmbeddedTtf = true,
    forbidType3 = true,
    requireTagged = false,
    requireStructure = false
  } = options;

  const bytes = readFileSync(path);
  const header = bytes.subarray(0, 32).toString('latin1');
  const pdf = await PDFDocument.load(bytes);
  const pageCount = pdf.getPageCount();

  if (expectedPageCount != null && pageCount !== expectedPageCount) {
    throw new Error(`${label}: PDF must contain exactly ${expectedPageCount} page(s), got ${pageCount}`);
  }

  const { width, height } = pdf.getPage(0).getSize();
  if (Math.abs(width - A4_MEDIA_BOX.width) > 0.5 || Math.abs(height - A4_MEDIA_BOX.height) > 0.5) {
    throw new Error(`${label}: expected A4 MediaBox, got ${width.toFixed(2)}×${height.toFixed(2)}pt`);
  }

  if (expectedTitle && requireTitle) {
    const title = (pdf.getTitle() || '').trim();
    if (!title.includes(expectedTitle)) {
      throw new Error(`${label}: PDF Title metadata must include "${expectedTitle}", got "${title || '(empty)'}"`);
    }
  }

  const source = pdfSearchCorpus(bytes);
  const structure = detectStructure(source, header);

  if (forbidType3 && structure.type3) {
    throw new Error(`${label}: Type 3 fonts are forbidden; use embedded static TrueType outlines`);
  }
  if (requireEmbeddedTtf && !structure.embeddedTtf) {
    throw new Error(`${label}: embedded TrueType font programs are missing`);
  }
  if (structure.images) {
    throw new Error(`${label}: raster image objects are forbidden in the resume PDF`);
  }
  if (requireTagged && !structure.tagged && !structure.structTree) {
    throw new Error(`${label}: tagged PDF structure is required`);
  }
  if (requireStructure && !structure.lang) {
    throw new Error(`${label}: /Lang dictionary entry is required for UA documents`);
  }

  return {
    pageCount,
    width,
    height,
    title: pdf.getTitle() || '',
    author: pdf.getAuthor() || '',
    subject: pdf.getSubject() || '',
    structure
  };
}
