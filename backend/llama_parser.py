from llama_index.readers.file import PDFReader
import os
import uuid

def parse_pdf(pdf_bytes):
    temp_filename = f"/tmp/{uuid.uuid4().hex}.pdf"
    with open(temp_filename, "wb") as f:
        f.write(pdf_bytes)

    loader = PDFReader()
    documents = loader.load_data(file=temp_filename)

    os.remove(temp_filename)
    return [doc.text for doc in documents]
