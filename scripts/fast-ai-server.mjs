import http from 'node:http';

const port = Number(process.env.PORT || 10000);
const apiKey = process.env.OPENAI_API_KEY;

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
  if (req.method !== 'POST' || req.url !== '/api/assistant/ask') return send(res, 404, { error: 'Not found' });

  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', async () => {
    try {
      const body = JSON.parse(raw || '{}');
      const question = String(body.question || '').trim();
      const mode = String(body.mode || 'chat');
      if (!question) return send(res, 400, { error: 'Question is required.' });
      if (!apiKey) return send(res, 503, { error: 'AI service is not configured yet.' });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          temperature: 0.2,
          messages: [
            { role: 'system', content: `You are StudyLoop AI, a fast general-purpose academic assistant. Answer the user's current question directly and accurately. Handle programming, mathematics, science, AI/ML, writing, study questions, projects, and general knowledge. If asked for code, give correct runnable code. If asked to calculate, calculate carefully. Explain beginner-friendly when appropriate. Do not invent facts. Mode: ${mode}. Plain text only.` },
            { role: 'user', content: question }
          ],
          max_tokens: 700
        })
      });

      const data = await response.json();
      if (!response.ok) return send(res, response.status, { error: data?.error?.message || 'AI request failed.' });
      const answer = data?.choices?.[0]?.message?.content?.trim();
      if (!answer) return send(res, 502, { error: 'AI returned an empty answer.' });

      const takeaways = answer.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean).slice(0, 3);
      return send(res, 200, { answer, takeaways, practiceQuestion: `Want a practice question based on: ${question}?` });
    } catch (error) {
      console.error(error);
      return send(res, 500, { error: 'Unable to process the AI request.' });
    }
  });
});

server.listen(port, '0.0.0.0', () => console.log(`StudyLoop fast AI listening on ${port}`));
