import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client


def get_supabase_client() -> Client:
    load_dotenv()  # Loads from .env in cwd if present
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not supabase_service_key:
        raise RuntimeError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment."
        )
    return create_client(supabase_url, supabase_service_key)


def upload_pdf(
    client: Client,
    pdf_path: Path,
    bucket: str = "documents",
    base_prefix: Optional[str] = None,
) -> str:
    assert pdf_path.exists() and pdf_path.is_file(), f"File not found: {pdf_path}"
    assert pdf_path.suffix.lower() == ".pdf", f"Not a PDF: {pdf_path}"

    storage = client.storage.from_(bucket)

    # Key in bucket: optional prefix + sanitized filename
    key_parts = []
    if base_prefix:
        key_parts.append(base_prefix.strip("/"))
    key_parts.append(_sanitize_filename_for_storage(pdf_path.name))
    storage_key = "/".join(key_parts)

    with pdf_path.open("rb") as f:
        # Supabase Storage expects header values as strings; use 'x-upsert': 'true'
        storage.upload(
            storage_key,
            f,
            file_options={
                "content-type": "application/pdf",
                "x-upsert": "true",
            },
        )

    return storage_key


def insert_metadata(
    client: Client,
    title: str,
    storage_bucket: str,
    storage_path: str,
    size_bytes: Optional[int],
    mime_type: str = "application/pdf",
):
    payload = {
        "title": title,
        "storage_bucket": storage_bucket,
        "storage_path": storage_path,
        "mime_type": mime_type,
        "size_bytes": size_bytes,
    }
    res = client.table("documents").insert(payload).execute()
    return res


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/upload_pdfs_to_supabase.py <local_folder> [optional_prefix]", file=sys.stderr)
        sys.exit(1)

    local_folder = Path(sys.argv[1]).expanduser().resolve()
    base_prefix = sys.argv[2] if len(sys.argv) > 2 else None
    if not local_folder.exists() or not local_folder.is_dir():
        print(f"Folder not found: {local_folder}", file=sys.stderr)
        sys.exit(1)

    client = get_supabase_client()
    bucket = "documents"

    pdf_files = sorted([p for p in local_folder.rglob("*.pdf")])
    if not pdf_files:
        print("No PDF files found.")
        return

    print(f"Found {len(pdf_files)} PDFs. Uploading to bucket '{bucket}'...")
    for pdf in pdf_files:
        try:
            storage_key = upload_pdf(client, pdf, bucket=bucket, base_prefix=base_prefix)
            size_bytes = pdf.stat().st_size if pdf.exists() else None
            title = pdf.stem.replace("_", " ").replace("-", " ").strip()
            insert_metadata(
                client,
                title=title,
                storage_bucket=bucket,
                storage_path=storage_key,
                size_bytes=size_bytes,
            )
            print(f"Uploaded and recorded: {pdf} -> {storage_key}")
        except Exception as e:
            print(f"Error uploading {pdf}: {e}", file=sys.stderr)


def _sanitize_filename_for_storage(filename: str) -> str:
    """Convert arbitrary filename to a Supabase Storage-safe key segment.

    - Normalize unicode and strip accents
    - Keep alphanumerics, dash, underscore, dot
    - Replace spaces with '-'
    - Collapse consecutive separators
    - Ensure it ends with the original extension
    """
    name = filename
    # Separate extension
    p = Path(name)
    stem, ext = p.stem, p.suffix
    if not ext:
        ext = ".pdf"
    # Normalize accents
    normalized = unicodedata.normalize("NFKD", stem)
    ascii_stem = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_stem = ascii_stem.replace(" ", "-")
    # Remove invalid chars (allow a-zA-Z0-9._-)
    ascii_stem = re.sub(r"[^A-Za-z0-9._-]", "-", ascii_stem)
    # Collapse multiple dashes or underscores
    ascii_stem = re.sub(r"[-_]{2,}", "-", ascii_stem).strip("-._")
    if not ascii_stem:
        ascii_stem = "document"
    # Limit length conservatively
    ascii_stem = ascii_stem[:180]
    ext = ".pdf" if ext.lower() != ".pdf" else ext
    return f"{ascii_stem}{ext}"


if __name__ == "__main__":
    main()
