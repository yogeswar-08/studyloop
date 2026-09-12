type DemoTask = {
  id: number;
  title: string;
  course: string;
  due: string;
  durationMinutes: number;
  tone: 'orange' | 'teal' | 'plum';
  completed: boolean;
};

type DemoNote = {
  id: number;
  title: string;
  content: string;
  summary: string | null;
  keyPoints: string[];
  createdAt: string;
  updatedAt: string;
};

type DemoSession = { id: number; minutes: number; subject: string; completedAt: string };

const TASKS_KEY = 'studyloop-demo-tasks-v2';
const NOTES_KEY = 'studyloop-demo-notes-v2';
const SESSIONS_KEY = 'studyloop-demo-sessions-v2';

const seedTasks: DemoTask[] = [
  { id: 1, title: 'Revise arrays & pointers', course: 'C Programming', due: 'Today', durationMinutes: 40, tone: 'teal', completed: false },
  { id: 2, title: 'Practice eigenvalue problems', course: 'Engineering Mathematics', due: 'Today', durationMinutes: 45, tone: 'orange', completed: false },
  { id: 3, title: 'Review quantum basics', course: 'Physics', due: 'Tomorrow', durationMinutes: 35, tone: 'plum', completed: false },
  { id: 4, title: 'Complete AI/ML reading notes', course: 'AI & ML', due: 'This week', durationMinutes: 30, tone: 'teal', completed: false },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* browser storage can be unavailable */ }
}

function tasks() { return load<DemoTask[]>(TASKS_KEY, seedTasks); }
function notes() {
  return load<DemoNote[]>(NOTES_KEY, [{
    id: 1,
    title: 'StudyLoop quick start',
    content: 'Start with one small task. Study in a focused block, check what you actually completed, then adapt the next block instead of forcing the original plan.',
    summary: 'A simple loop: plan one step, focus, measure progress, then adapt the next step.',
    keyPoints: ['Start small', 'Use focused study blocks', 'Adapt from real progress'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }]);
}
function sessions() { return load<DemoSession[]>(SESSIONS_KEY, []); }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function bodyOf(init?: RequestInit) {
  try { return init?.body ? JSON.parse(String(init.body)) : {}; } catch { return {}; }
}

function dashboard() {
  const currentTasks = tasks();
  const currentSessions = sessions();
  const weeklyMinutes = currentSessions.reduce((sum, item) => sum + Math.max(0, Number(item.minutes || 0)), 0);
  const progress = Math.min(100, Math.round((weeklyMinutes / 300) * 100));
  const dayKeys = new Set(currentSessions.map((item) => new Date(item.completedAt).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (dayKeys.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const upcoming = currentTasks.filter((task) => !task.completed).slice(0, 3).map((task) => {
    const relative = task.due.toLowerCase();
    const date = task.due === 'Tomorrow' ? new Date(Date.now() + 86400000) : new Date();
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      title: task.title,
      relative,
      tone: task.tone,
    };
  });
  return { tasks: currentTasks, weeklyProgress: progress, streak, upcoming };
}

function planner(body: any) {
  const subject = String(body.subject || 'Your subject').trim();
  const topics = String(body.topics || 'core concepts').trim();
  const difficulty = String(body.difficulty || 'beginner');
  const hours = Math.max(0.5, Math.min(12, Number(body.hoursPerDay) || 2));
  const requestedDays = Math.max(1, Math.min(14, Number(body.daysUntilExam) || 5));
  const days = Math.min(requestedDays, 7);
  const minutes = Math.max(30, Math.round(hours * 60));
  const topicList = topics.split(',').map((item) => item.trim()).filter(Boolean);
  const levelText = difficulty === 'advanced' ? 'challenge-level practice' : difficulty === 'intermediate' ? 'guided practice' : 'foundation-first learning';
  const actions = difficulty === 'advanced'
    ? 'Solve timed problems, explain the solution aloud, then review mistakes.'
    : difficulty === 'intermediate'
      ? 'Review the concept, solve 3–5 problems, then do a closed-book recall.'
      : 'Learn one small concept, work through one example, then recall it without notes.';
  return {
    title: `${subject} — adaptive study plan`,
    overview: `A ${requestedDays}-day roadmap using ${Math.round(minutes)} minutes per day, starting with ${levelText}. The demo shows the first ${days} high-value days so the plan stays easy to scan.`,
    days: Array.from({ length: days }, (_, i) => ({
      day: i === 0 ? 'Today' : `Day ${i + 1}`,
      focus: topicList[i % Math.max(topicList.length, 1)] || `${subject} practice + active recall`,
      minutes,
      action: i === days - 1 ? 'Mixed revision, timed practice, and a short self-test.' : actions,
    })),
    tips: [
      `Difficulty: ${difficulty}. Change it to see a different study strategy.`,
      'Start with the hardest topic while energy is highest.',
      'If a session slips, rebuild the next block instead of cramming.',
    ],
  };
}

function assistant(body: any) {
  const q = String(body.question || '').trim();
  const mode = String(body.mode || 'explain');
  const lower = q.toLowerCase();
  let answer = '';
  let takeaways: string[] = [];
  let practiceQuestion = '';

  if (mode === 'summarize') {
    answer = q ? `In short: ${q.replace(/\s+/g, ' ').slice(0, 220)}${q.length > 220 ? '…' : ''}. Focus on the main idea, the key terms, and one example.` : 'Add a paragraph or concept and StudyLoop will turn it into a compact revision summary.';
    takeaways = ['Find the main idea first.', 'Keep only the terms you must recall.', 'Attach one concrete example.'];
    practiceQuestion = 'Write the idea in three sentences without looking back.';
  } else if (mode === 'practice') {
    answer = q ? `Practice mode: start with a simple test for “${q.slice(0, 120)}${q.length > 120 ? '…' : ''}”. Try it from memory before checking your notes.` : 'Add a topic and StudyLoop will turn it into a small recall exercise.';
    takeaways = ['Attempt before checking notes.', 'Explain why your answer works.', 'Review only the gap you missed.'];
    practiceQuestion = `Explain “${q || 'your topic'}” as if you were teaching it to a classmate.`;
  } else if (lower.includes('pointer') || lower.includes('c')) {
    answer = 'For C pointers, think of a pointer as a variable that stores an address. If int x = 10, then int *p = &x stores the address of x, while *p accesses the value at that address.';
    takeaways = ['& gets an address.', '* dereferences a pointer.', 'Changing *p changes the value stored in x.'];
    practiceQuestion = 'What is the difference between p and *p in the example?';
  } else if (lower.includes('recursion')) {
    answer = 'Recursion is when a function solves a problem by calling itself on a smaller version of that problem. A correct recursive solution needs a base case so the calls eventually stop.';
    takeaways = ['Identify the base case.', 'Make each call move toward the base case.', 'Trace one small example by hand.'];
    practiceQuestion = 'What would happen if a recursive function had no base case?';
  } else if (lower.includes('exam') || lower.includes('study')) {
    answer = 'Use a short cycle: choose one topic, study it for 25 minutes, close your notes, recall the key ideas, then solve 2–3 questions. Use the result to decide what should come next.';
    takeaways = ['Pick one next step.', 'Measure actual completion.', 'Adapt the next session from reality.'];
    practiceQuestion = 'What is the one topic you should be able to explain without notes after this session?';
  } else {
    answer = q ? `Start with one clear definition of “${q}”, then connect it to one example and one practice question. That gives you a small, testable study loop instead of trying to learn everything at once.` : 'Break the problem into one small concept, one example, and one practice question.';
    takeaways = ['Define the idea simply.', 'Work through one concrete example.', 'Test yourself before moving on.'];
    practiceQuestion = 'Explain the idea in your own words without looking at your notes.';
  }
  return { answer, takeaways, practiceQuestion };
}

const quizBank = [
  { question: 'Which operator gives the address of a variable in C?', options: ['*', '&', '%', '#'], correctIndex: 1, explanation: 'The & operator produces the address of a variable.', topic: 'Pointers', level: 'beginner' },
  { question: 'Which loop is commonly used when the number of iterations is known?', options: ['for', 'switch', 'goto', 'typedef'], correctIndex: 0, explanation: 'A for loop is a natural choice when initialization, condition, and update are known.', topic: 'Loops', level: 'beginner' },
  { question: 'What does == compare in C?', options: ['Addresses only', 'Values for equality', 'Two strings automatically', 'Memory size'], correctIndex: 1, explanation: '== is the equality comparison operator; = is assignment.', topic: 'Operators', level: 'beginner' },
  { question: 'What is an array?', options: ['A collection of same-type elements', 'A function pointer only', 'A compiler directive', 'A loop condition'], correctIndex: 0, explanation: 'An array stores multiple elements of the same declared type.', topic: 'Arrays', level: 'beginner' },
  { question: 'What is active recall?', options: ['Rereading notes repeatedly', 'Testing yourself from memory', 'Highlighting every line', 'Watching a video twice'], correctIndex: 1, explanation: 'Active recall means retrieving information from memory instead of only reviewing it.', topic: 'Study skills', level: 'beginner' },
  { question: 'What is the base case in recursion?', options: ['The stopping condition', 'The fastest loop', 'The first array element', 'A compiler error'], correctIndex: 0, explanation: 'The base case stops recursive calls from continuing forever.', topic: 'Recursion', level: 'intermediate' },
  { question: 'If p is an int pointer, what does *p access?', options: ['The pointer type', 'The value at the stored address', 'The variable name', 'The array length'], correctIndex: 1, explanation: 'Dereferencing a pointer accesses the value stored at its address.', topic: 'Pointers', level: 'intermediate' },
  { question: 'Why is active recall useful?', options: ['It tests retrieval', 'It removes all mistakes', 'It avoids practice', 'It replaces sleep'], correctIndex: 0, explanation: 'Retrieving information from memory gives stronger evidence of what you can actually recall.', topic: 'Study skills', level: 'intermediate' },
  { question: 'Which statement best describes time complexity?', options: ['How output looks', 'How resource use grows with input size', 'How long code is to type', 'How many variables exist'], correctIndex: 1, explanation: 'Time complexity describes how running time tends to grow as input size grows.', topic: 'Algorithms', level: 'advanced' },
  { question: 'What is a useful first step when debugging?', options: ['Change random lines', 'Reproduce the problem consistently', 'Delete the program', 'Ignore the error'], correctIndex: 1, explanation: 'A reproducible failure gives you a reliable case to inspect and fix.', topic: 'Problem solving', level: 'advanced' },
];

function quiz(body: any) {
  const subject = String(body.subject || 'Computer Science').trim();
  const topics = String(body.topics || 'core concepts').trim();
  const difficulty = String(body.difficulty || 'beginner');
  const preferred = quizBank.filter((item) => item.level === difficulty);
  const pool = preferred.length >= 5 ? preferred : quizBank;
  const questions = [...pool].sort((a, b) => (a.question + topics).localeCompare(b.question + topics)).slice(0, 5).map(({ level: _level, ...item }) => item);
  return { title: `${subject} — ${difficulty} quick check`, questions };
}

function grade(body: any) {
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const missed = questions.filter((q: any, i: number) => Number(answers[i]) !== Number(q.correctIndex));
  const score = questions.length - missed.length;
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const weakTopics = [...new Set(missed.map((q: any) => q.topic || 'General'))].slice(0, 3);
  return {
    score,
    total: questions.length,
    percentage,
    headline: percentage >= 80 ? 'Strong recall — keep the loop going.' : 'Good signal — a few gaps are worth revisiting.',
    feedback: weakTopics.length ? `Your answers suggest revisiting ${weakTopics.join(', ')}. Focus on one weak area before the next quiz.` : 'You handled the questions well. A fresh mixed quiz later will check retention.',
    nextStep: weakTopics.length ? `Review ${weakTopics.join(', ')} and retry a short quiz.` : 'Try another mixed quiz after your next focus session.',
    weakTopics,
    missed: missed.map((q: any) => ({ question: q.question, correctAnswer: q.options[q.correctIndex], explanation: q.explanation, topic: q.topic })),
  };
}

function summarize(content: string) {
  const sentences = content.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const summary = sentences.slice(0, 2).join('. ') + (sentences.length ? '.' : '');
  return {
    summary: summary || 'Add a little more text and StudyLoop will create a concise revision summary.',
    keyPoints: sentences.slice(0, 4).map((s) => s.length > 100 ? `${s.slice(0, 97)}...` : s),
  };
}

function recovery() {
  const currentTasks = tasks();
  const open = currentTasks.filter((task) => !task.completed);
  const completed = currentTasks.length - open.length;
  const score = Math.max(35, Math.min(92, 55 + completed * 12));
  const today = open.slice(0, 3).map((task) => ({ title: task.title, minutes: Math.min(task.durationMinutes, 35), reason: task.due === 'Today' ? 'Due today — keep this first.' : 'High-value next step.' }));
  const tomorrow = open.slice(3, 5).map((task) => ({ title: task.title, minutes: Math.min(task.durationMinutes, 30), reason: 'Move this forward without overloading today.' }));
  return {
    status: open.length ? 'recovery' : 'on_track',
    headline: open.length ? 'Your plan can recover without cramming.' : 'You are on track.',
    realityScore: score,
    diagnosis: open.length ? `You have ${open.length} open tasks. StudyLoop is prioritizing the smallest useful steps first and protecting your available time.` : 'You are caught up. Keep the next sessions light and use them for retention.',
    today: today.length ? today : [{ title: 'Short active-recall review', minutes: 20, reason: 'Keep momentum without adding pressure.' }],
    tomorrow: tomorrow.length ? tomorrow : [{ title: 'Mixed practice + self-test', minutes: 25, reason: 'Use tomorrow to verify retention.' }],
    rule: 'If completion drops again, shorten the next plan before adding more work.',
  };
}

async function handle(path: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const body = bodyOf(init);
  let match = path;
  try {
    if (/^https?:\/\//i.test(path)) match = new URL(path).pathname;
  } catch { /* keep original path */ }
  match = match.split('?')[0];

  if (match === '/api/dashboard' && method === 'GET') return json(dashboard());
  if (match === '/api/tasks' && method === 'POST') {
    const list = tasks();
    const item: DemoTask = {
      id: Date.now(),
      title: String(body.title || 'New task'),
      course: String(body.course || 'Personal'),
      due: String(body.due || 'Whenever you need it'),
      durationMinutes: Math.max(1, Number(body.durationMinutes) || 25),
      tone: ['orange', 'teal', 'plum'].includes(body.tone) ? body.tone : 'teal',
      completed: false,
    };
    list.push(item);
    save(TASKS_KEY, list);
    return json(item, 201);
  }
  const taskMatch = match.match(/^\/api\/tasks\/(\d+)$/);
  if (taskMatch && method === 'PATCH') {
    const list = tasks();
    const id = Number(taskMatch[1]);
    const index = list.findIndex((t) => t.id === id);
    if (index < 0) return json({ error: 'Task not found' }, 404);
    list[index] = { ...list[index], ...body };
    save(TASKS_KEY, list);
    return json(list[index]);
  }
  if (match === '/api/planner/generate' && method === 'POST') return json(planner(body));
  if (match === '/api/assistant/ask' && method === 'POST') return json(assistant(body));
  if (match === '/api/quiz/generate' && method === 'POST') return json(quiz(body));
  if (match === '/api/quiz/grade' && method === 'POST') return json(grade(body));
  if (match === '/api/notes' && method === 'GET') return json(notes());
  if (match === '/api/notes' && method === 'POST') {
    const list = notes();
    const now = new Date().toISOString();
    const item: DemoNote = { id: Date.now(), title: String(body.title || 'Untitled note'), content: String(body.content || ''), summary: body.summary ?? null, keyPoints: Array.isArray(body.keyPoints) ? body.keyPoints : [], createdAt: now, updatedAt: now };
    list.unshift(item);
    save(NOTES_KEY, list);
    return json(item, 201);
  }
  const noteMatch = match.match(/^\/api\/notes\/(\d+)$/);
  if (noteMatch && method === 'PATCH') {
    const list = notes();
    const id = Number(noteMatch[1]);
    const index = list.findIndex((n) => n.id === id);
    if (index < 0) return json({ error: 'Note not found' }, 404);
    list[index] = { ...list[index], ...body, updatedAt: new Date().toISOString() };
    save(NOTES_KEY, list);
    return json(list[index]);
  }
  if (noteMatch && method === 'DELETE') {
    save(NOTES_KEY, notes().filter((n) => n.id !== Number(noteMatch[1])));
    return new Response(null, { status: 204 });
  }
  if (match === '/api/notes/summarize' && method === 'POST') return json(summarize(String(body.content || '')));
  if (match === '/api/study-sessions' && method === 'POST') {
    const list = sessions();
    const item: DemoSession = { id: Date.now(), minutes: Math.max(1, Number(body.minutes) || 25), subject: String(body.subject || 'General study'), completedAt: new Date().toISOString() };
    list.unshift(item);
    save(SESSIONS_KEY, list);
    return json(item, 201);
  }
  if (match === '/api/adaptive/replan' && method === 'POST') return json(recovery());
  return json({ error: `Demo API route not found: ${method} ${match}` }, 404);
}

export function installDemoApi() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    let url = rawUrl;
    try { url = new URL(rawUrl, window.location.origin).pathname; } catch { /* keep raw URL */ }
    if (url.startsWith('/api/')) return handle(url, init);
    return originalFetch(input, init);
  };
}
