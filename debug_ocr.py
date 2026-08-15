import json
import re

log_path = '/Users/kyrus/.gemini/antigravity-ide/brain/87ba2fdf-fd80-4f3b-98f9-05731fe33cf3/.system_generated/logs/transcript_full.jsonl'

with open(log_path, 'r') as f:
    lines = f.readlines()

for line in reversed(lines):
    try:
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT':
            content = data.get('content', '')
            if '==Start of PDF==' in content:
                print("Found PDF start in message:", content[:100].replace('\n', ' '))
                print("Count of ==Start of PDF==:", content.count('==Start of PDF=='))
                break
    except:
        continue

