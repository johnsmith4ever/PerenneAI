const { embed } = require("ai");
const { createMistral } = require("@ai-sdk/mistral");
require('dotenv').config({ path: '.env.local' });

async function run() {
  const mistralProvider = createMistral({ apiKey: process.env.MISTRAL_API_KEY });
  const { embedding } = await embed({
    model: mistralProvider.textEmbeddingModel("mistral-embed"),
    value: "Algebra",
  });
  
  const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/rpc/match_aqa_specs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      query_embedding: embedding,
      match_threshold: 0.10,
      match_count: 10,
      filter_subject: null,
      filter_level: null
    })
  });
  const data = await res.json();
  console.log(data);
}
run();
