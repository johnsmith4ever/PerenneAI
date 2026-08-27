const http = require('http');

const data = JSON.stringify({
  messages: [{ role: "user", content: "Write a short 10 word story." }],
  model: "Gemini 3.6 Flash"
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(body));
});

req.write(data);
req.end();
