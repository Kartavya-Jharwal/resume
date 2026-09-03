/** Proof-router helpers — outbound destinations for leave-site OG previews. */

export const PROOF_STATUSES = new Set(['live', 'planned', 'internal', 'none']);

export function loadProofRouter(doc) {
  const proofs = Array.isArray(doc?.proofs) ? doc.proofs : [];
  return proofs.map(normalizeProof);
}

function normalizeProof(proof) {
  return {
    id: proof.id,
    status: proof.status || 'none',
    kind: proof.kind || 'article',
    label: proof.label || proof.title || proof.id,
    title: proof.title || proof.label || proof.id,
    description: proof.description || '',
    url: proof.url || '',
    match: Array.isArray(proof.match) ? proof.match : [],
    ogImage: proof.ogImage || '',
    domain: proof.domain || '',
    projectIds: Array.isArray(proof.projectIds) ? proof.projectIds : [],
    workIds: Array.isArray(proof.workIds) ? proof.workIds : [],
    notes: proof.notes || ''
  };
}

export function proofById(proofs, id) {
  return proofs.find(proof => proof.id === id) || null;
}

export function proofForUrl(proofs, href) {
  if (!href) return null;
  const normalized = String(href).trim().replace(/\/$/, '');
  for (const proof of proofs) {
    if (proof.status !== 'live') continue;
    for (const candidate of proof.match.length ? proof.match : [proof.url]) {
      if (!candidate) continue;
      const needle = String(candidate).trim().replace(/\/$/, '');
      if (normalized === needle || normalized.startsWith(`${needle}/`)) return proof;
    }
  }
  return null;
}

export function proofForProject(proofs, projectId) {
  return proofs.find(proof => proof.status === 'live' && proof.projectIds.includes(projectId)) || null;
}

/** Runtime payload: paths relative to site root (dist/). */
export function toRuntimeProof(proof) {
  return {
    id: proof.id,
    status: proof.status,
    kind: proof.kind,
    label: proof.label,
    title: proof.title,
    description: proof.description,
    url: proof.url,
    match: proof.match,
    ogImage: proof.ogImage ? `/${proof.ogImage.replace(/^\/+/, '')}` : '',
    domain: proof.domain,
    projectIds: proof.projectIds,
    workIds: proof.workIds
  };
}
