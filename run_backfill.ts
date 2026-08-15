async function runBackfill() {
  console.log("Starting backfill process...");
  let hasMore = true;
  let totalBackfilled = 0;

  while (hasMore) {
    try {
      const response = await fetch("http://localhost:3000/api/admin/backfill", {
        method: "POST",
        headers: {
          "Authorization": "Bearer supersecret123"
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Backfill API Error:", data);
        break;
      }
      
      console.log(data.message);
      
      if (data.message === "No missing embeddings found!") {
        hasMore = false;
      } else {
        const countMatch = data.message.match(/Successfully backfilled (\d+) embeddings/);
        if (countMatch) {
          totalBackfilled += parseInt(countMatch[1]);
        }
        if (data.remaining !== "More remaining") {
          hasMore = false;
        }
      }
    } catch (e) {
      console.error("Fetch error:", e);
      break;
    }
  }
  
  console.log(`\n🎉 Backfill complete! Total embeddings generated: ${totalBackfilled}`);
}

runBackfill();
