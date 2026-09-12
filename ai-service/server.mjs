import http from 'node:http';

const PORT = Number(process.env.PORT || 10000);

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

const stopWords = new Set('the a an and or but is are was were be to of in on for with from this that it as at by about what how why when where which who i you your my me we they do does can could would should'.split(' '));

function keywords(text) {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').split(/\\s+/).filter(w => w.length > 2 && !stopWords.has(w)))].slice(0, 6);
}

function localAnswer(question, mode) {
  const q = question.trim();
  const lower = q.toLowerCase();
  const words = keywords(q);
  let answer;
  let practice = '';

  if (/^(hi|hello|hey|hii|yo)\\b/.test(lower)) {
    answer = `Hey! 👋 I’m StudyLoop AI. Ask me anything you’re working on — academics, coding, projects, planning, or general questions.`;
    practice = 'What are you working on right now?';
  } else if (/(explain|what is|what are|meaning|define)\\b/.test(lower)) {
    const topic = q.replace(/^(please\\s+)?(explain|what is|what are|meaning of|define)\\s*/i, '').replace(/[?]$/, '').trim() || 'this topic';
    answer = `### ${topic}\n\nHere’s a simple way to understand it:\n\n**${topic}** is a concept that should be understood by focusing on what it does, why it matters, and a small example. Start with the basic idea first, then connect it to a real situation.\n\n**Quick example:** Think of it as a process where an input is transformed into a useful output. The exact steps depend on the topic.\n\nIf you give me the exact definition, question, code, or chapter you’re studying, I can break it down step by step.`;
    practice = `Can you give me one example of ${topic}?`;
  } else if (/(code|program|error|bug|javascript|python|java|c\\b|c\\+\\+|html|css|sql|algorithm|array|loop|pointer|function)/.test(lower)) {
    answer = `I can help you debug or build this. For a coding problem, the fastest approach is: **1)** identify the expected output, **2)** check the input and data types, **3)** trace the logic line by line, and **4)** test a small edge case.\n\nYour question mentions: **${words.join(', ') || 'a programming problem'}**.\n\nPaste the exact code and the error/output you’re getting, and I’ll point out the problem and give you a corrected version.`;
    practice = 'Can you paste the code and the exact error message?';
  } else if (/(plan|schedule|study|exam|revision|learn|roadmap|prepare)/.test(lower)) {
    answer = `A practical way to handle this is to turn the goal into small sessions:\n\n**1. Learn:** understand one concept.\n**2. Practice:** solve 2–5 questions without looking at the answer.\n**3. Measure:** mark what you could and could not solve.\n**4. Recover:** spend the next session on the weakest area.\n\nThat creates the StudyLoop: **Plan → Study → Measure → Replan.**`;
    practice = 'What is your deadline and how many hours can you study today?';
  } else if (/(why|how)/.test(lower)) {
    answer = `Good question. The key is to separate the problem into smaller parts and identify the cause before jumping to a solution.\n\nFor **“how”** questions, I’d normally give you the steps first and then a concrete example. For **“why”** questions, I’d explain the underlying reason and then show where it matters.`;
    practice = 'Want me to apply that reasoning to your exact example?';
  } else {
    answer = `I can help with that. Based on your question, the main topic appears to be **${words.join(', ') || 'your request'}**.\n\nA useful way to approach it is to first identify the exact goal, separate the problem into smaller parts, and then work through the highest-impact part first. If there are assumptions, calculations, code, or specific constraints involved, share them and I’ll work through them with you.`;
    practice = 'What outcome are you trying to achieve?';
  }

  return {
    answer,
    takeaways: [
      'Start with the exact goal before choosing a solution.',
      'Break complex problems into smaller, testable steps.',
      'Use examples and feedback to improve the next attempt.',
    ],
    practiceQuestion: practice,
    mode,
    source: 'StudyLoop local AI fallback',
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    send(res, 200, { ok: true, configured: true, model: 'StudyLoop Local Assistant' });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/assistant/ask') {
    try {
      const body = await readBody(req);
      const question = String(body.question || '').trim();
      if (!question) throw new Error('Question is required.');
      send(res, 200, localAnswer(question, String(body.mode || 'chat')));
    } catch (error) {
      send(res, 400, { error: error instanceof Error ? error.message : 'Assistant unavailable.' });
    }
    return;
  }
  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`StudyLoop AI service listening on ${PORT}`);
});
