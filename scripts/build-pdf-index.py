#!/usr/bin/env python3
"""Build the local retrieval data from the user-provided PDF.

Requires pdfplumber. This script is not needed at runtime; it writes one small
ES module with page-numbered passages. Page numbers are physical PDF page
numbers, not the printed numbers. It does not download or upload anything.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

import pdfplumber


def chunks(text, target=850):
    # Pages in this PDF often start with a standalone printed page number.
    lines = text.splitlines()
    if lines and re.fullmatch(r"\s*\d{1,3}\s*", lines[0]):
        lines = lines[1:]
    if lines and re.fullmatch(r"\s*\d{1,3}\s*", lines[-1]):
        lines = lines[:-1]
    text = re.sub(r"\s+", " ", " ".join(lines)).strip()
    if not text:
        return []
    # Use complete sentences where possible, without crossing PDF pages.
    pieces = re.split(r"(?<=[.!?])\s+(?=[\"'“‘(A-Z0-9])", text)
    output, current = [], ""
    for piece in pieces:
        if current and len(current) + len(piece) + 1 > target:
            output.append(current)
            current = ""
        # Split rare long sentences on word boundaries; never silently drop text.
        while len(piece) > target * 1.35:
            cut = piece.rfind(" ", 0, target)
            if cut < target // 2:
                cut = target
            output.append(piece[:cut].strip())
            piece = piece[cut:].strip()
        current = (current + " " + piece).strip()
    if current:
        output.append(current)
    return output


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "netlify/lib/knowledge/patanjali.mjs")
    args = parser.parse_args()
    data = []
    with pdfplumber.open(args.pdf) as pdf:
        page_count = len(pdf.pages)
        for page_number, page in enumerate(pdf.pages, 1):
            page_text = page.extract_text() or ""
            # A contents list names topics but is not evidence for an answer.
            if re.match(r"\s*Contents\s", page_text, re.I):
                continue
            for index, text in enumerate(chunks(page_text), 1):
                data.append({"id": f"P{page_number}-{index}", "page": page_number, "text": text})
    if not data:
        raise SystemExit("No text could be extracted from the PDF.")
    sha = hashlib.sha256(args.pdf.read_bytes()).hexdigest()
    info = {"title": "Patanjali Yoga Sutras — supplied commentary PDF", "page_count": page_count,
            "pdf_sha256": sha, "page_numbers": "physical PDF pages, 1-based",
            "extraction": "pdfplumber text extraction; formatting and text are not human-verified"}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("// Generated from the supplied PDF; physical page numbers are 1-based.\n"
                           "// Extracted text is not human-verified.\n"
                           f"export const SOURCE = {json.dumps(info, ensure_ascii=False)};\n"
                           f"export default {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};\n", encoding="utf-8")
    print(f"Extracted {len(data)} passages from {page_count} PDF pages to {args.output}")


if __name__ == "__main__":
    main()
