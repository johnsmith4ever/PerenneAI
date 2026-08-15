import json
import re

log_path = '/Users/kyrus/.gemini/antigravity-ide/brain/87ba2fdf-fd80-4f3b-98f9-05731fe33cf3/.system_generated/logs/transcript_full.jsonl'

with open(log_path, 'r') as f:
    lines = f.readlines()

# Find the last USER_INPUT
last_user_msg = ""
for line in reversed(lines):
    try:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            last_user_msg = data.get('content', '')
            break
    except:
        continue

# Split by ==Start of PDF==
pdfs = last_user_msg.split('==Start of PDF==')
if len(pdfs) < 3:
    print("Could not find both PDFs")
    exit(1)

alevel_pdf = pdfs[1]
gcse_pdf = pdfs[2]

def clean_and_chunk(pdf_text, level):
    # Extract OCR blocks
    ocr_blocks = re.findall(r'==Start of OCR for page \d+==\n(.*?)\n==End of OCR', pdf_text, re.DOTALL)
    full_text = "\n".join(ocr_blocks)
    
    # Remove headers/footers
    full_text = re.sub(r'AQA A-level Mathematics 7357.*?January 2018\n', '', full_text)
    full_text = re.sub(r'Visit for the most up-to-date specification.*?administration \d+\n?', '', full_text)
    full_text = re.sub(r'GCSE Mathematics \(8300\).*?Version 1\.0\n', '', full_text)
    full_text = re.sub(r'\d+\s+Visit aqa\.org\.uk/8300.*?administration\n?', '', full_text)
    full_text = re.sub(r'Visit aqa\.org\.uk/8300.*?administration\s+\d+\n?', '', full_text)
    
    # Split by double newlines or single newlines
    lines = full_text.split('\n')
    chunks = []
    current_chunk = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.lower() in ['content', 'basic foundation content additional foundation', 'content', 'higher content only', 'basic foundation content', 'additional foundation content']:
            continue
        
        # If line starts with a topic code (e.g., A1, G14, OT1.1) or looks like a new section
        if re.match(r'^([A-Z]{1,2}[0-9]+(?:\.[0-9]+)?|\d+\.\d+(?:\.\d+)?)', line) or len(current_chunk) > 5:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
        
        current_chunk.append(line)
        
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    # Filter out very short or junk chunks
    valid_chunks = [c for c in chunks if len(c) > 20 and not c.startswith('Copyright ©')]
    
    # Format for DB
    results = []
    for i, c in enumerate(valid_chunks):
        results.append({
            "subject": "Mathematics",
            "level": level,
            "topicCode": f"{level}-{i}",
            "content": c
        })
    return results

alevel_chunks = clean_and_chunk(alevel_pdf, "A-Level")
gcse_chunks = clean_and_chunk(gcse_pdf, "GCSE")

all_chunks = alevel_chunks + gcse_chunks
with open('maths_parsed.json', 'w') as f:
    json.dump(all_chunks, f, indent=2)

print(f"Extracted {len(alevel_chunks)} A-Level chunks and {len(gcse_chunks)} GCSE chunks.")
