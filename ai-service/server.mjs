import http from 'node:http';

const PORT = Number(process.env.PORT || 10000);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

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
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9+#. ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)))].slice(0, 8);
}

function extractTopic(question) {
  return question
    .replace(/^(please\s+)?(teach me|explain|what is|what are|meaning of|define|quiz me on|make a roadmap for|roadmap for)\s*/i, '')
    .replace(/[?]$/, '')
    .trim() || 'this topic';
}

function localFastAnswer(question, mode) {
  const topic = extractTopic(question);
  if (mode === 'fast-quiz') {
    return `## ⚡ ${topic} — 5-question adaptive quiz\n\n**Q1 · Easy**\nWhat is the main idea of ${topic}?\n\n**Q2 · Easy**\nGive one real-world or programming example of ${topic}.\n\n**Q3 · Medium**\nWhat is one common mistake or misconception about ${topic}?\n\n**Q4 · Medium**\nApply ${topic} to a simple new situation. Explain your reasoning.\n\n**Q5 · Challenge**\nSolve a slightly unfamiliar problem involving ${topic} without looking at notes.\n\n---\n### Answer-check method\nScore yourself 0–5. If you miss Q1–Q2, relearn the basics. If you miss Q3, review misconceptions. If you miss Q4–Q5, do another worked example and practice again.\n\n**StudyLoop rule:** don't just reread — retrieve, check, fix, repeat.`;
  }
  if (mode === 'fast-roadmap') {
    return `## 🗺️ ${topic} — compact learning roadmap\n\n**1. Prerequisites (5 min)**\nList the 2–3 ideas you must already understand.\n\n**2. First learning sprint (20 min)**\nLearn the definition → intuition → core parts → one worked example.\n\n**3. Practice (30 min)**\nAttempt 3–5 questions from easy to medium without notes.\n\n**4. Weakness check (5 min)**\nMark each concept: ✅ strong / ⚠️ shaky / ❌ weak.\n\n**5. Reteach (10 min)**\nSpend the next sprint only on the weakest concept.\n\n**6. Revision**\nReturn after 1 day, then 3 days, then 7 days.\n\n**Exam-ready when:** you can explain the concept simply, solve unseen questions, and make fewer mistakes without notes.`;
  }
  if (mode === 'fast-explain') {
    return `## 🧠 ${topic} — explained simply\n\n**In one sentence:** Start by understanding what ${topic} does and why it exists.\n\n**Think of it like:** a simple input → process → output system.\n\n**Tiny example:** Take one small example and trace exactly what enters, what changes, and what comes out.\n\n**Common mistake:** memorising steps without understanding why each step happens.\n\n**Check yourself:** Explain ${topic} in your own words in 30 seconds. If you cannot, go back to the smallest confusing part and relearn that first.`;
  }
  return `## ⚡ ${topic} — 10-minute Fast Learning Loop\n\n**0:00–0:30 · Intuition**\nUnderstand the big picture: what it is, what problem it solves, and why it matters.\n\n**1:00–4:00 · 3 core ideas**\n**① Foundation:** identify the basic building block.\n**② Mechanism:** understand how the pieces work together.\n**③ Application:** know when to use it and when not to.\n\n**4:00–6:00 · Example**\nWork through one small example step by step. Don't copy it — predict the next step first.\n\n**6:00–7:00 · Common mistake**\nWrite down one error students commonly make and how to avoid it.\n\n**7:00–10:00 · Retrieval practice**\nTry one question without notes. Then explain your answer in your own words.\n\n---\n### 🔁 Weakness detector\nIf you cannot explain the foundation → **RETEACH BASICS**.\nIf you understand it but cannot apply it → **PRACTICE MORE**.\nIf you can solve it but make repeated small errors → **TARGET THE MISTAKE**.\n\n**Next step:** run Quiz Me on the same topic and use your score to decide what StudyLoop should teach next.`;
}

function localAnswer(question, mode) {
  const q = question.trim();
  const lower = q.toLowerCase();
  const words = keywords(q);
  let answer;
  let practice = '';

  if (mode.startsWith('fast-')) {
    answer = localFastAnswer(q, mode);
    practice = `Try one question on ${extractTopic(q)} without looking at your notes.`;
  } else if (/^(hi|hello|hey|hii|yo)\b/.test(lower)) {
    answer = `Hey! 👋 I’m StudyLoop AI. Ask me anything you’re working on — academics, coding, projects, planning, or general questions.`;
    practice = 'What are you working on right now?';
  } else if (/(explain|what is|what are|meaning|define)\b/.test(lower)) {
    const topic = extractTopic(q);
    answer = `### ${topic}\n\nHere’s a simple way to understand it:\n\n**${topic}** is a concept that should be understood by focusing on what it does, why it matters, and a small example. Start with the basic idea first, then connect it to a real situation.\n\n**Quick example:** Think of it as a process where an input is transformed into a useful output. The exact steps depend on the topic.\n\nIf you give me the exact definition, question, code, or chapter you’re studying, I can break it down step by step.`;
    practice = `Can you give me one example of ${topic}?`;
  } else if (/(code|program|error|bug|javascript|python|java|c\b|c\+\+|html|css|sql|algorithm|array|loop|pointer|function)/.test(lower)) {
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

async function openAIAnswer(question, mode) {
  if (!OPENAI_API_KEY) return null;
  const modeInstruction = mode.startsWith('fast-')
    ? 'You are StudyLoop Fast Learning AI. Teach in short, beginner-friendly chunks. Prioritize active recall, examples, practice, weakness detection, reteaching, and exam usefulness. Never overwhelm the learner.'
    : 'You are StudyLoop AI, a practical academic and coding coach. Be concise, accurate, encouraging, and action-oriented.';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.35,
      messages: [
        { role: 'system', content: modeInstruction },
        { role: 'user', content: question },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const data = await response.json();
  return {
    answer: data?.choices?.[0]?.message?.content || '',
    takeaways: ['Use active recall instead of passive rereading.', 'Practice the weakest concept next.', 'Re-test after a short gap.'],
    practiceQuestion: 'Explain the hardest part in your own words without notes.',
    mode,
    source: 'StudyLoop AI',
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    send(res, 200, { ok: true, configured: Boolean(OPENAI_API_KEY), model: OPENAI_API_KEY ? OPENAI_MODEL : 'StudyLoop Local Assistant' });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/assistant/ask') {
    try {
      const body = await readBody(req);
      const question = String(body.question || '').trim();
      const mode = String(body.mode || 'chat');
      if (!question) throw new Error('Question is required.');
      let result = null;
      try { result = await openAIAnswer(question, mode); } catch (error) { console.warn('OpenAI unavailable; using local fallback.', error); }
      send(res, 200, result || localAnswer(question, mode));
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
