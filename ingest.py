import PyPDF2
import requests
import re
import time

pdfs = [
    {"path": "/Users/kyrus/.gemini/antigravity-ide/brain/87ba2fdf-fd80-4f3b-98f9-05731fe33cf3/media__1786195187554.pdf", "level": "A-Level"},
    {"path": "/Users/kyrus/.gemini/antigravity-ide/brain/87ba2fdf-fd80-4f3b-98f9-05731fe33cf3/media__1786195197648.pdf", "level": "GCSE"}
]

API_URL = "http://localhost:3000/api/admin/ingest-spec"
SECRET = "supersecret123"

def chunk_text(text, level):
    # Split by double newlines or single newlines
    lines = text.split('\n')
    chunks = []
    current_chunk = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Simple heuristic: new paragraph on short sentences starting with uppercase
        if re.match(r'^([A-Z]{1,2}[0-9]+(?:\.[0-9]+)?|\d+\.\d+(?:\.\d+)?)', line) or len(current_chunk) > 6:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
        
        current_chunk.append(line)
        
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    # Filter
    valid_chunks = [c for c in chunks if len(c) > 20 and 'Copyright' not in c]
    return valid_chunks

for pdf in pdfs:
    print(f"Processing {pdf['level']}...")
    reader = PyPDF2.PdfReader(pdf['path'])
    full_text = ""
    for page in reader.pages:
        if page.extract_text():
            full_text += page.extract_text() + "\n"
    
    chunks = chunk_text(full_text, pdf['level'])
    print(f"Found {len(chunks)} chunks for {pdf['level']}.")
    
    # We will only insert the first 50 chunks for testing, or as many as we can without rate limits
    for i, c in enumerate(chunks):
        if i >= 100: # Limit to 100 to avoid rate limit or timeout
            break
        print(f"Ingesting {pdf['level']} chunk {i+1}...")
        try:
            res = requests.post(API_URL, json={
                "subject": "Mathematics",
                "level": pdf['level'],
                "topicCode": f"{pdf['level']}-{i}",
                "content": c
            }, headers={"Authorization": f"Bearer {SECRET}"})
            if res.status_code != 200:
                print(f"Error {res.status_code}: {res.text}")
        except Exception as e:
            print("Failed:", e)
        time.sleep(1) # Sleep to avoid rate limits

print("Done.")
