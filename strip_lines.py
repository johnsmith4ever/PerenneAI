import re

with open('sidebar_recovered.txt', 'r') as f:
    lines = f.readlines()

content_lines = []
start_parsing = False
for line in lines:
    if "The following code has been modified" in line:
        start_parsing = True
        continue
    if "The above content does NOT show the entire file contents" in line or "The above content shows the entire, complete file contents" in line:
        break
        
    if start_parsing:
        # Match "123: " and remove it
        match = re.match(r'^\d+:\s?(.*)$', line)
        if match:
            content_lines.append(match.group(1) + '\n')
        elif line.strip() == "":
            content_lines.append('\n')

with open('src/components/layout/sidebar.tsx', 'w') as f:
    f.writelines(content_lines)

print("Recovered sidebar length:", len(content_lines))
