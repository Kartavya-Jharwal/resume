#!/usr/bin/env python3
"""
Pillar 3 PDF emit — maximum WeasyPrint capability surface.

Targets PDF/UA-2 (fallback PDF/UA-1) with:
  - tagged structure tree
  - full unmodified font embedding
  - hinting + high DPI raster policy (text remains vectors)
  - Info + XMP metadata
  - PDF 2.0 when the variant allows
"""

from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

GTK_CANDIDATES = [
    Path(r"D:\KJ\Programs_Files\GTK3-Runtime\bin"),
    Path(r"D:\KJ\Programs_Files\GTK3-Runtime Win64\bin"),
    Path(r"C:\Program Files\GTK3-Runtime Win64\bin"),
    Path(r"C:\Program Files\GTK3-Runtime\bin"),
]

# Prefer newest accessibility profile; fall back for older WeasyPrint builds.
VARIANT_CANDIDATES = ("pdf/ua-2", "pdf/ua-1")


def bootstrap_gtk() -> str | None:
    if sys.platform != "win32":
        return None
    for gtk_bin in GTK_CANDIDATES:
        if not gtk_bin.is_dir():
            continue
        os.add_dll_directory(str(gtk_bin))
        os.environ["PATH"] = str(gtk_bin) + os.pathsep + os.environ.get("PATH", "")
        return str(gtk_bin)
    return None


def load_meta(path: Path | None) -> dict:
    if not path or not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def apply_metadata(document, meta: dict) -> None:
    title = meta.get("title")
    if title:
        document.metadata.title = title
    authors = meta.get("authors") or ([meta["author"]] if meta.get("author") else [])
    if authors:
        document.metadata.authors = list(authors)
    if meta.get("description"):
        document.metadata.description = meta["description"]
    if meta.get("keywords"):
        document.metadata.keywords = list(meta["keywords"])
    document.metadata.generator = meta.get("generator") or "Kartavya Resume Engine · WeasyPrint"
    document.metadata.lang = meta.get("lang") or "en"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    document.metadata.created = meta.get("created") or now
    document.metadata.modified = meta.get("modified") or now
    custom = {
        "ResumeProfileId": meta.get("profileId", ""),
        "TypesettingSpec": meta.get("specVersion", ""),
        "EmitPipeline": "pillar3-emit",
    }
    custom.update(meta.get("custom") or {})
    document.metadata.custom = {k: str(v) for k, v in custom.items() if v}


def write_max_pdf(html_path: Path, pdf_path: Path, meta: dict) -> dict:
    from weasyprint import HTML
    from weasyprint.text.fonts import FontConfiguration

    font_config = FontConfiguration()
    document = HTML(
        filename=str(html_path),
        base_url=str(html_path.parent),
    ).render(font_config=font_config)

    apply_metadata(document, meta)

    identifier = meta.get("pdfIdentifier") or f"urn:uuid:{uuid.uuid4()}"
    common = dict(
        hinting=True,
        dpi=600,
        optimize_images=False,
        full_fonts=True,
        pdf_tags=True,
        custom_metadata=True,
        pdf_identifier=identifier.encode("utf-8") if isinstance(identifier, str) else identifier,
        uncompressed_pdf=False,
    )

    last_error: Exception | None = None
    for variant in VARIANT_CANDIDATES:
        try:
            document.write_pdf(
                str(pdf_path),
                pdf_variant=variant,
                pdf_version="2.0",
                **common,
            )
            return {
                "variant": variant,
                "pdfVersion": "2.0",
                "pdfIdentifier": identifier if isinstance(identifier, str) else identifier.decode("utf-8", "ignore"),
                "fullFonts": True,
                "pdfTags": True,
                "hinting": True,
                "dpi": 600,
            }
        except Exception as error:  # noqa: BLE001 — try next variant
            last_error = error

    # Tagged PDF 2.0 without formal variant if UA profiles reject the document.
    try:
        document.write_pdf(str(pdf_path), pdf_version="2.0", **common)
        return {
            "variant": "tagged-pdf-2.0",
            "pdfVersion": "2.0",
            "pdfIdentifier": identifier if isinstance(identifier, str) else identifier.decode("utf-8", "ignore"),
            "fullFonts": True,
            "pdfTags": True,
            "hinting": True,
            "dpi": 600,
            "warning": str(last_error) if last_error else None,
        }
    except Exception:
        document.write_pdf(str(pdf_path), **common)
        return {
            "variant": "tagged",
            "pdfVersion": None,
            "pdfIdentifier": identifier if isinstance(identifier, str) else identifier.decode("utf-8", "ignore"),
            "fullFonts": True,
            "pdfTags": True,
            "hinting": True,
            "dpi": 600,
            "warning": str(last_error) if last_error else None,
        }


def main() -> int:
    if len(sys.argv) not in (3, 4):
        print("usage: emit-pdf.py <composition.html> <output.pdf> [meta.json]", file=sys.stderr)
        return 2

    html_path = Path(sys.argv[1]).resolve()
    pdf_path = Path(sys.argv[2]).resolve()
    meta_path = Path(sys.argv[3]).resolve() if len(sys.argv) == 4 else None
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    gtk = bootstrap_gtk()
    meta = load_meta(meta_path)
    capability = write_max_pdf(html_path, pdf_path, meta)

    print(f"pdf:{pdf_path}")
    if gtk:
        print(f"gtk:{gtk}")
    print(f"capability:{json.dumps(capability, separators=(',', ':'))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
