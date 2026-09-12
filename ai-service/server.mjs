import http from 'node:http';

const PORT = Number(process.env.PORT || 10000);
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, status, data) {
  res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50000) req.destroy();
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function answer(body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured on the AI service.');

  const question = String(body.question || '').trim();
  const mode = String(body.mode || 'explain');
  if (!question) throw new Error('Question is required.');

  const system = `You are StudyLoop, an excellent AI academic copilot for college students.\n\nYour job is to answer ANY legitimate student question naturally and accurately, not only predefined topics. You can explain computer science, mathematics, physics, biology, engineering, programming, study skills, writing, projects, debugging, and general academic concepts. If a question is outside academics, answer helpfully when appropriate. Never pretend to know something you are unsure about.\n\nAdapt to the student's level. For difficult topics, explain from first principles, use examples, and structure the answer clearly. For coding questions, give correct runnable examples when useful. For calculations, show the reasoning. For ambiguous questions, make a reasonable assumption and state it briefly.\n\nReturn ONLY valid JSON with exactly these fields:\n{\"answer\": string, \"takeaways\": string[], \"practiceQuestion\": string}\nThe answer can be detailed enough to be useful. takeaways should contain 3 concise points. practiceQuestion should be one useful follow-up question.`;

  const user = `Mode: ${mode}\nStudent question:\n${question}`;
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed (${response.status}). ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned an empty response.');
  const parsed = JSON.parse(content);
  if (typeof parsed.answer !== 'string' || !Array.isArray(parsed.takeaways) || typeof parsed.practiceQuestion !== 'string') {
    throw new Error('AI returned an invalid response format.');
  }
  return {
    answer: parsed.answer,
    takeaways: parsed.takeaways.map(String).slice(0, 3),
    practiceQuestion: parsed.practiceQuestion,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    send(res, 200, { ok: true, configured: Boolean(process.env.OPENAI_API_KEY), model: MODEL });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/assistant/ask') {
    try {
      const body = await readBody(req);
      send(res, 200, await answer(body));
    } catch (error) {
      send(res, 503, { error: error instanceof Error ? error.message : 'AI service unavailable.' });
    }
    return;
  }
  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`StudyLoop AI service listening on ${PORT}`);
});
