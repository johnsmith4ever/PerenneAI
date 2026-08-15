// Run this script using: npx tsx feed_data.ts
import fs from "fs";
import path from "path";
// @ts-ignore
import pdfParse from "pdf-parse";
import { generateObject } from "ai";
import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const mistralProvider = createMistral({
  apiKey: process.env.MISTRAL_API_KEY
});

const mistralProvider2 = createMistral({
  apiKey: process.env.MISTRAL_API_KEY_2
});

// A chunk size of ~20,000 characters is safe for formatting tasks
const CHUNK_SIZE = 20000;

async function processPdfChunk(textChunk: string) {
  let result;
  try {
    result = await generateText({
      model: mistralProvider("mistral-large-latest"),
      prompt: `You are an elite data structuring AI. Extract the AQA specification points from the following raw PDF text.\n\nRaw Text:\n${textChunk}\n\nRules:\n1. Identify the Subject and Level (GCSE or A-Level).\n2. Find every specification point (they usually have a topic code like 3.1.1, 4.2.1).\n3. Extract the exact content for each point.\n4. If the text does not contain specification points, return an empty array.\n\nYou must reply ONLY with a valid JSON array of objects. Each object must have these exact keys: "subject", "level", "topicCode", "content". Do not include markdown code blocks, just the raw JSON array. Example: [{"subject": "Biology", "level": "GCSE", "topicCode": "4.1.1", "content": "Cells..."}]`
    });
  } catch (e: any) {
    if (e?.statusCode === 429 || e?.message?.includes('Rate limit')) {
      console.log('   ⚠️ Rate limit hit on primary Mistral key. Switching to backup key...');
      result = await generateText({
        model: mistralProvider2("mistral-large-latest"),
        prompt: `You are an elite data structuring AI. Extract the AQA specification points from the following raw PDF text.\n\nRaw Text:\n${textChunk}\n\nRules:\n1. Identify the Subject and Level (GCSE or A-Level).\n2. Find every specification point (they usually have a topic code like 3.1.1, 4.2.1).\n3. Extract the exact content for each point.\n4. If the text does not contain specification points, return an empty array.\n\nYou must reply ONLY with a valid JSON array of objects. Each object must have these exact keys: "subject", "level", "topicCode", "content". Do not include markdown code blocks, just the raw JSON array. Example: [{"subject": "Biology", "level": "GCSE", "topicCode": "4.1.1", "content": "Cells..."}]`
      });
    } else {
      throw e;
    }
  }
  
  try {
    let rawText = result.text.trim();
    if (rawText.startsWith("\`\`\`json")) rawText = rawText.slice(7);
    if (rawText.startsWith("\`\`\`")) rawText = rawText.slice(3);
    if (rawText.endsWith("\`\`\`")) rawText = rawText.slice(0, -3);
    return JSON.parse(rawText.trim());
  } catch (e) {
    console.error("Failed to parse JSON from Groq:", result.text);
    return [];
  }
}

async function ingestData() {
  try {
    const pdfDir = path.join(process.cwd(), "AQA_PDFs");
    
    if (!fs.existsSync(pdfDir)) {
      console.error("❌ AQA_PDFs folder not found! I just created it. Please put PDFs inside it.");
      fs.mkdirSync(pdfDir);
      return;
    }
    
    const files = fs.readdirSync(pdfDir).filter(f => f.toLowerCase().endsWith(".pdf"));
    
    if (files.length === 0) {
      console.error("❌ No PDFs found in the AQA_PDFs folder. Please add some and run again!");
      return;
    }

    console.log(`Found ${files.length} PDFs. Starting ingestion pipeline...`);

    const outDir = path.join(process.cwd(), "extracted_data");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    for (const file of files) {
      const outPath = path.join(outDir, `${file.replace(/\.[^/.]+$/, "")}.json`);
      if (fs.existsSync(outPath)) {
        console.log(`\n⏭️ Skipping ${file} (already extracted to ${path.basename(outPath)}).`);
        continue;
      }
      
      console.log(`\n📄 Processing ${file}...`);
      const filePath = path.join(pdfDir, file);
      const dataBuffer = fs.readFileSync(filePath);
      
      console.log(`   Extracting text from PDF...`);
      const pdfData = await pdfParse(dataBuffer);
      const rawText = pdfData.text;
      console.log(`   Extracted ${rawText.length} characters of raw text.`);

      // Chunk the text to avoid context limits or formatting hallucinations on massive texts
      let allSpecs: any[] = [];
      for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
        const chunk = rawText.slice(i, i + CHUNK_SIZE);
        console.log(`   🧠 Asking Gemini to structure chunk ${Math.floor(i/CHUNK_SIZE) + 1}...`);
        
        try {
          const extracted = await processPdfChunk(chunk);
          if (extracted && extracted.length > 0) {
            allSpecs = allSpecs.concat(extracted);
            console.log(`      Found ${extracted.length} points in this chunk.`);
          }
        } catch (e) {
          console.error(`      ⚠️ Failed to structure chunk, skipping.`, e);
        }
      }

      console.log(`   Found ${allSpecs.length} total specification points in ${file}.`);

      if (allSpecs.length > 0) {
        const outDir = path.join(process.cwd(), "extracted_data");
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir);
        }
        const outPath = path.join(outDir, `${file.replace(/\.[^/.]+$/, "")}.json`);
        fs.writeFileSync(outPath, JSON.stringify(allSpecs, null, 2));
        console.log(`   💾 Saved extracted data locally to: extracted_data/${path.basename(outPath)}`);
      }

      console.log(`   Uploading to Database...`);
      for (const spec of allSpecs) {
        try {
          const response = await fetch("http://localhost:3000/api/admin/ingest-spec", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer supersecret123"
            },
            body: JSON.stringify(spec)
          });
          
          if (!response.ok) {
            console.error(`      ❌ Failed to upload ${spec.topicCode}`);
          }
        } catch (e) {
          console.error(`      ❌ Error uploading ${spec.topicCode}:`, e);
        }
      }
      console.log(`   ✅ Finished uploading ${file}!`);
    }
    console.log("\n🎉 All PDFs have been successfully ingested!");
  } catch (err) {
    console.error("Fatal error during ingestion:", err);
  }
}

ingestData();
