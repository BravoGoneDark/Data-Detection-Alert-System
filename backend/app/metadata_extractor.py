# app/metadata_extractor.py

import csv
import io
import json
import mimetypes
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ExtractedMetadata:
    columns: list[str] = field(default_factory=list)
    row_count: int | None = None
    col_count: int | None = None
    mime_type: str = "application/octet-stream"


def extract_metadata(filename: str, file_bytes: bytes) -> ExtractedMetadata:
    """
    Safely inspects file bytes and filename extension to extract schema attributes:
    - mime_type
    - column list (normalized to clean lowercase strings)
    - row_count
    - col_count
    """
    ext = Path(filename).suffix.lower()
    guessed_type, _ = mimetypes.guess_type(filename)
    mime_type = guessed_type or "application/octet-stream"

    # 1. Handle CSV / TSV
    if ext in [".csv", ".tsv", ".txt"] or "csv" in mime_type or "text" in mime_type:
        try:
            # Decode sample to determine delimiter and structure
            text_stream = io.StringIO(file_bytes.decode("utf-8", errors="replace"))
            sample = text_stream.read(8192)
            text_stream.seek(0)

            delimiter = ","
            if ext == ".tsv" or "\t" in sample and sample.count("\t") > sample.count(","):
                delimiter = "\t"

            reader = csv.reader(text_stream, delimiter=delimiter)
            header_row = next(reader, None)

            if header_row:
                # Clean and normalize header columns
                columns = [col.strip().lower() for col in header_row if col.strip()]
                # Count total remaining rows safely
                row_count = sum(1 for row in reader if any(field.strip() for field in row))
                col_count = len(columns)

                if col_count > 0:
                    return ExtractedMetadata(
                        columns=columns,
                        row_count=row_count,
                        col_count=col_count,
                        mime_type="text/csv" if delimiter == "," else "text/tab-separated-values",
                    )
        except Exception:
            pass

    # 2. Handle JSON
    if ext == ".json" or "json" in mime_type:
        try:
            data = json.loads(file_bytes.decode("utf-8", errors="replace"))
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                # Array of records
                columns = sorted(list({k.strip().lower() for record in data if isinstance(record, dict) for k in record.keys()}))
                return ExtractedMetadata(
                    columns=columns,
                    row_count=len(data),
                    col_count=len(columns),
                    mime_type="application/json",
                )
            elif isinstance(data, dict):
                # Key-value dictionary
                columns = sorted([k.strip().lower() for k in data.keys()])
                return ExtractedMetadata(
                    columns=columns,
                    row_count=1,
                    col_count=len(columns),
                    mime_type="application/json",
                )
        except Exception:
            pass

    # 3. Fallback for generic text / binary
    return ExtractedMetadata(
        columns=[],
        row_count=None,
        col_count=None,
        mime_type=mime_type,
    )
