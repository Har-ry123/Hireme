from io import BytesIO

from docx import Document
from docx.table import Table
from pypdf import PdfReader

SUPPORTED_EXTENSIONS = (".pdf", ".docx")


class DocumentError(ValueError):
    """The uploaded file can't be read as a resume. The message is safe to show to the client."""


def read_pdf(data: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            raise DocumentError("Password-protected PDFs are not supported.")
        pages = [page.extract_text() or "" for page in reader.pages]
    except DocumentError:
        raise
    except Exception as e:
        raise DocumentError("Could not read this file as a PDF.") from e
    return "\n".join(pages)


def read_docx(data: bytes) -> str:
    try:
        document = Document(BytesIO(data))
        lines = []
        # iter_inner_content keeps tables in reading order; many resumes are laid out with them
        for block in document.iter_inner_content():
            if isinstance(block, Table):
                for row in block.rows:
                    lines.append(" | ".join(cell.text.strip() for cell in row.cells))
            else:
                lines.append(block.text)
    except Exception as e:
        raise DocumentError("Could not read this file as a DOCX.") from e
    return "\n".join(lines)


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        text = read_pdf(data)
    elif name.endswith(".docx"):
        text = read_docx(data)
    else:
        raise DocumentError("Unsupported file type. Upload a PDF or DOCX.")

    text = text.strip()
    if not text:
        raise DocumentError("No text found in this file. Scanned or image-only resumes are not supported.")
    return text
