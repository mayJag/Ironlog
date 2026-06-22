import sys
from pypdf import PdfReader

def extract_text(pdf_path, output_path):
    reader = PdfReader(pdf_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                f.write(f"--- PAGE {i+1} ---\n")
                f.write(text + "\n\n")

if __name__ == "__main__":
    pdf_file = r"C:\Users\jagga\Downloads\jeff nippard\jeff nippard\The Pure Bodybulding Program Phase 2 (Jeff Nippard) (Z-Library).pdf"
    out_file = "pdf_dump.txt"
    extract_text(pdf_file, out_file)
    print("Done")
