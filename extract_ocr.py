import json
import re
import urllib.request
import urllib.parse
import sys

transcript_path = '/Users/kyrus/.gemini/antigravity-ide/brain/87ba2fdf-fd80-4f3b-98f9-05731fe33cf3/.system_generated/logs/transcript_full.jsonl'

pdfs = []
try:
    with open(transcript_path, 'r') as f:
        lines = f.readlines()
        for line in lines:
            if '==Start of PDF==' in line:
                obj = json.loads(line)
                if obj.get('content') and '==Start of PDF==' in obj['content']:
                    pdfs.append(obj['content'])
except Exception as e:
    print(f"Error reading transcript: {e}")
    sys.exit(1)

if not pdfs:
    print("Could not find any OCR text.")
    sys.exit(1)

specs = []

for pdf_text in pdfs:
    # Identify type
    pdf_type = "Past Paper"
    if "Mark scheme" in pdf_text or "MARK SCHEME" in pdf_text:
        pdf_type = "Mark Scheme"
    elif "Specification" in pdf_text:
        pdf_type = "Specification"

    # Clean up the OCR markers
    clean_text = re.sub(r'==End of OCR.*?==Start of OCR.*?==\n', '', pdf_text, flags=re.DOTALL)
    clean_text = re.sub(r'==Start of PDF==\n==Screenshot.*?==\n', '', clean_text, flags=re.DOTALL)
    clean_text = re.sub(r'==End of PDF==', '', clean_text)
    
    # Chunk into 2000 character blocks
    chunk_size = 2000
    for i in range(0, len(clean_text), chunk_size):
        chunk = clean_text[i:i+chunk_size].strip()
        if len(chunk) > 50:
            specs.append({
                "subject": "Biology",
                "level": "A-Level",
                "topicCode": pdf_type,
                "content": chunk
            })

print(f"Extracted {len(specs)} chunks from {len(pdfs)} documents.")

if len(specs) > 0:
    url = "http://localhost:3000/api/admin/ingest-spec"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer supersecret123"
    }

    success_count = 0
    for spec in specs:
        data = json.dumps(spec).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    success_count += 1
        except Exception as e:
            print(f"Failed to upload chunk: {e}")
    
    print(f"Successfully uploaded {success_count} chunks to database.")
