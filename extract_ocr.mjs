import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const transcriptPath = '/Users/kyrus/.gemini/antigravity-ide/brain/87ba2fdf-fd80-4f3b-98f9-05731fe33cf3/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

let ocrText = '';
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('==Start of PDF==')) {
    const obj = JSON.parse(lines[i]);
    if (obj.content && obj.content.includes('==Start of PDF==')) {
      ocrText = obj.content;
      break;
    }
  }
}

if (!ocrText) {
  console.log("Could not find OCR text in transcript.");
  process.exit(1);
}

// Extract sections from OCR text
const regex = /3\.\d\.?\d?\S* (.*?)\n([\s\S]*?)(?=3\.\d\.?\d?\S* |==Screenshot)/g;
let match;
const specs = [];

while ((match = regex.exec(ocrText)) !== null) {
  const title = match[1].trim();
  const content = match[2].replace(/==End of OCR.*?==Start of OCR.*?==/gs, '').replace(/Students should be able to:/g, '').trim();
  
  if (content.length > 50 && title.length < 100) {
    specs.push({
      subject: "Biology",
      level: "A-Level",
      topicCode: title,
      content: content.slice(0, 3000) // Keep it manageable
    });
  }
}

console.log(`Extracted ${specs.length} specification points.`);
fs.writeFileSync('AQA_Documents.json', JSON.stringify(specs, null, 2));
console.log('Saved to AQA_Documents.json');
