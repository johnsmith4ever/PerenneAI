import os
import requests
import json

MISTRAL_KEY = "YOUR_API_KEY"
SUPABASE_URL = "https://istizzojkchvwbxnoivy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzdGl6em9qa2NodndieG5vaXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NjY5OTYsImV4cCI6MjEwMDE0Mjk5Nn0.driL6QhosL1yD8gTyPaHM-9j7cbPzuzAujSk__7qyGc"

res = requests.post(
    "https://api.mistral.ai/v1/embeddings",
    headers={"Authorization": f"Bearer {MISTRAL_KEY}"},
    json={"model": "mistral-embed", "input": ["Algebra"]}
)
embedding = res.json()["data"][0]["embedding"]

res2 = requests.post(
    f"{SUPABASE_URL}/rest/v1/rpc/match_aqa_specs",
    headers={
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    },
    json={
        "query_embedding": embedding,
        "match_threshold": 0.10,
        "match_count": 10,
        "filter_subject": None,
        "filter_level": None
    }
)
print(res2.status_code)
print(json.dumps(res2.json(), indent=2))
