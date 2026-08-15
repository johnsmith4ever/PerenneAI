import json
import os

path = '/Users/kyrus/.gemini/antigravity-ide/brain/87ba2fdf-fd80-4f3b-98f9-05731fe33cf3/.system_generated/logs/transcript_full.jsonl'
with open(path, 'r') as f:
    lines = f.readlines()

for line in reversed(lines):
    data = json.loads(line)
    if data.get('type') == 'VIEW_FILE' and 'sidebar.tsx' in data.get('content', '') and 'Total Lines: 239' in data.get('content', ''):
        print("Found VIEW_FILE with 239 lines!")
        content = data['content']
        with open('sidebar_recovered.txt', 'w') as out:
            out.write(content)
        break
