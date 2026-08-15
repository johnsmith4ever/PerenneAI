import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const EXTRACTED_DIR = path.join(process.cwd(), "extracted_data");

async function uploadAll() {
  const files = fs.readdirSync(EXTRACTED_DIR).filter(f => f.endsWith(".json"));
  
  console.log(`Found ${files.length} JSON files. Beginning batch upload...`);
  
  let totalUploaded = 0;
  
  for (const file of files) {
    console.log(`\n📄 Processing ${file}...`);
    const filePath = path.join(EXTRACTED_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    
    let successCount = 0;
    
    for (const spec of data) {
      try {
        const response = await fetch("http://localhost:3000/api/admin/ingest-spec", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer supersecret123"
          },
          body: JSON.stringify(spec)
        });
        
        if (response.ok) {
          successCount++;
          totalUploaded++;
        } else {
          console.error(`      ❌ Failed: ${spec.topicCode}`);
        }
      } catch (e) {
        console.error(`      ❌ Error on ${spec.topicCode}:`, e);
      }
    }
    
    console.log(`✅ Synced ${successCount} points from ${file} to Supabase!`);
  }
  
  console.log(`\n🎉 BATCH UPLOAD COMPLETE! A total of ${totalUploaded} points are safely in Supabase.`);
}

uploadAll().catch(console.error);
