"""
Document Text Extraction Utility
Extracts text from various document formats for RAG processing
"""
import logging
from typing import Optional, Tuple
import os

logger = logging.getLogger(__name__)

def extract_text_from_pdf(file_path: str) -> Tuple[Optional[str], Optional[dict]]:
    """
    Extract text from PDF file using PyMuPDF (fitz)

    Returns:
        Tuple of (extracted_text, metadata)
        metadata contains: page_count, word_count, char_count
    """
    try:
        import fitz  # PyMuPDF

        logger.info(f"📄 Extracting text from PDF: {file_path}")

        # Open PDF
        doc = fitz.open(file_path)
        page_count = len(doc)

        # Extract text from all pages
        text_content = []
        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_content.append(f"--- Page {page_num + 1} ---\n{text}")

        # Combine all text BEFORE closing
        full_text = "\n\n".join(text_content)

        # Calculate metadata
        word_count = len(full_text.split())
        char_count = len(full_text)

        # Close document after all extraction
        doc.close()

        metadata = {
            "page_count": page_count,
            "word_count": word_count,
            "char_count": char_count,
            "extraction_method": "pymupdf"
        }

        logger.info(f"✅ Extracted {word_count} words from {page_count} pages")

        return full_text, metadata

    except ImportError:
        logger.error("❌ PyMuPDF (fitz) not installed. Install with: pip install PyMuPDF")
        return None, None
    except Exception as e:
        logger.error(f"❌ PDF extraction failed: {str(e)}")
        return None, None


def extract_text_from_file(file_path: str, mime_type: str = None) -> Tuple[Optional[str], Optional[dict]]:
    """
    Extract text from various file formats

    Args:
        file_path: Path to the file
        mime_type: Optional MIME type to determine extraction method

    Returns:
        Tuple of (extracted_text, metadata)
    """
    if not os.path.exists(file_path):
        logger.error(f"❌ File not found: {file_path}")
        return None, None

    # Determine file type
    file_ext = os.path.splitext(file_path)[1].lower()

    # PDF files
    if file_ext == '.pdf' or (mime_type and 'pdf' in mime_type.lower()):
        return extract_text_from_pdf(file_path)

    # Plain text files
    elif file_ext in ['.txt', '.md', '.json', '.xml', '.html', '.csv']:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

            metadata = {
                "word_count": len(text.split()),
                "char_count": len(text),
                "extraction_method": "direct_read"
            }

            logger.info(f"✅ Read text file: {metadata['word_count']} words")
            return text, metadata

        except Exception as e:
            logger.error(f"❌ Text file read failed: {str(e)}")
            return None, None

    # Unsupported format
    else:
        logger.warning(f"⚠️ Unsupported file format: {file_ext}")
        return None, None


# Async wrapper for use in FastAPI
async def extract_text_async(file_path: str, mime_type: str = None) -> Tuple[Optional[str], Optional[dict]]:
    """Async wrapper for text extraction"""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, extract_text_from_file, file_path, mime_type)
