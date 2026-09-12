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

const TASKS_KEY = 'studyloop-demo-tasks-v1';
const NOTES_KEY = 'studyloop-demo-notes-v1';
const SESSIONS_KEY = 'studyloop-demo-sessions-v1';

const seedTasks: DemoTask[] = [
  { id: 1, title: 'Revise arrays & pointers', course: 'C Programming', due: 'Today', durationMinutes: 40, tone: 'teal', completed: false },
  { id: 2, title: 'Practice eigenvalue problems', course: 'Engineering Mathematics', due: 'Today', durationMinutes: 45, tone: 'orange', completed: false },
  { id: 3, title: 'Review quantum basics', course: 'Physics', due: 'Tomorrow', durationMinutes: 35, tone: 'plum', completed: false },
  { id: 4, title: 'Complete AI/ML reading notes', course: 'AI & ML', due: 'This week', durationMinutes: 30, tone: 'teal', completed: false },
];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* demo mode */ }
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
  const weeklyMinutes = currentSessions.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const progress = Math.min(100, Math.round((weeklyMinutes / 300) * 100));
  const dayKeys = new Set(currentSessions.map((item) => new Date(item.completedAt).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (dayKeys.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    tasks: currentTasks,
    weeklyProgress: progress,
    streak,
    upcoming: currentTasks.filter((task) => !task.completed).slice(0, 3).map((task) => ({
      day: task.due === 'Tomorrow' ? 'SUN' : 'SAT',
      date: task.due === 'Tomorrow' ? 'Sep 13' : 'Sep 12',
      title: task.title,
      relative: task.due.toLowerCase(),
      tone: task.tone,
    })),
  };
}

function planner(body: any) {
  const subject = String(body.subject || 'Your subject');
  const topics = String(body.topics || 'core concepts');
  const hours = Number(body.hoursPerDay || 2);
  const days = Math.max(1, Math.min(5, Number(body.daysUntilExam || 5)));
  const minutes = Math.max(30, Math.round(hours * 60));
  return {
    title: `${subject} — adaptive study plan`,
    overview: `A ${days}-day plan built around ${Math.round(minutes)} minutes per day, with extra attention on ${topics.split(',')[0]?.trim() || topics}.`,
    days: Array.from({ length: days }, (_, i) => ({
      day: i === 0 ? 'Today' : `Day ${i + 1}`,
      focus: i === 0 ? topics.split(',')[0]?.trim() || topics : `${subject} practice + active recall`,
      minutes,
      action: i === days - 1 ? 'Mixed revision, timed practice, and a short self-test.' : 'Learn one chunk, solve a few problems, then write a 3-line recall summary.',
    })),
    tips: ['Start with the hardest topic while energy is highest.', 'Use active recall instead of rereading everything.', 'If a session slips, rebuild the next block instead of cramming.'],
  };
}

function assistant(body: any) {
  const q = String(body.question || '');
  const lower = q.toLowerCase();
  let answer = 'Break the problem into one small concept, one example, and one practice question. Then check what you can recall without looking at the notes.';
  let takeaways = ['Define the idea in simple words.', 'Work through one concrete example.', 'Test yourself before moving on.'];
  if (lower.includes('c') || lower.includes('pointer')) {
    answer = 'For C pointers, think of a pointer as a variable that stores an address. If int x = 10, then int *p = &x stores the address of x, while *p accesses the value at that address.';
    takeaways = ['& gets an address.', '* dereferences a pointer.', 'Change *p and you change the value stored in x.'];
  } else if (lower.includes('exam') || lower.includes('study')) {
    answer = 'Use a short cycle: choose one topic, study it for 25 minutes, close your notes, recall the key ideas, then solve 2–3 questions. StudyLoop uses that evidence to decide what should come next.';
    takeaways = ['Pick one next step.', 'Measure actual completion.', 'Adapt the next session from reality.'];
  }
  return { answer, takeaways, practiceQuestion: 'Explain the idea in your own words without looking at your notes.' };
}

const quizBank = [
  { question: 'Which operator gives the address of a variable in C?', options: ['*', '&', '%', '#'], correctIndex: 1, explanation: 'The & operator produces the address of a variable.', topic: 'Pointers' },
  { question: 'Which loop is commonly used when the number of iterations is known?', options: ['for', 'switch', 'goto', 'typedef'], correctIndex: 0, explanation: 'A for loop is a natural choice when initialization, condition, and update are known.', topic: 'Loops' },
  { question: 'What does == compare in C?', options: ['Addresses only', 'Values for equality', 'Two strings automatically', 'Memory size'], correctIndex: 1, explanation: '== is the equality comparison operator; = is assignment.', topic: 'Operators' },
  { question: 'What is an array?', options: ['A collection of same-type elements', 'A function pointer only', 'A compiler directive', 'A loop condition'], correctIndex: 0, explanation: 'An array stores multiple elements of the same declared type in contiguous memory.', topic: 'Arrays' },
  { question: 'What is active recall?', options: ['Rereading notes repeatedly', 'Testing yourself from memory', 'Highlighting every line', 'Watching a video twice'], correctIndex: 1, explanation: 'Active recall means retrieving information from memory instead of only reviewing it.', topic: 'Study skills' },
];

function quiz(body: any) {
  const subject = String(body.subject || 'Computer Science');
  const topics = String(body.topics || 'core concepts');
  return { title: `${subject} — ${topics.split(',')[0]?.trim() || 'quick check'}`, questions: quizBank };
}

function grade(body: any) {
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const missed = questions.filter((q: any, i: number) => Number(answers[i]) !== Number(q.correctIndex));
  const score = questions.length - missed.length;
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const weakTopics = [...new Set(missed.map((q: any) => q.topic || 'General'))].slice(0, 3);
  return {
    score, total: questions.length, percentage,
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
  return { summary: summary || 'A concise revision summary will appear here.', keyPoints: sentences.slice(0, 4).map((s) => s.length > 100 ? `${s.slice(0, 97)}...` : s) };
}

function recovery() {
  const currentTasks = tasks();
  const open = currentTasks.filter((task) => !task.completed);
  const completed = currentTasks.length - open.length;
  const score = Math.max(35, Math.min(92, 55 + completed * 12));
  const today = open.slice(0, 3).map((task) => ({ title: task.title, minutes: Math.min(task.durationMinutes, 35), reason: task.due === 'Today' ? 'Due today — keep this first.' : 'High-value next step.' }));
  const tomorrow = open.slice(3, 5).map((task) => ({ title: task.title, minutes: Math.min(task.durationMinutes, 30), reason: 'Move this forward without overloading today.' }));
  return {
    status: 'recovery',
    headline: 'Your plan can recover without cramming.',
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
  const match = path.split('?')[0];

  if (match === '/api/dashboard' && method === 'GET') return json(dashboard());
  if (match === '/api/tasks' && method === 'POST') {
    const list = tasks();
    const item: DemoTask = { id: Date.now(), title: body.title || 'New task', course: body.course || 'Personal', due: body.due || 'Whenever you need it', durationMinutes: Number(body.durationMinutes || 25), tone: body.tone || 'teal', completed: false };
    list.push(item); save(TASKS_KEY, list); return json(item, 201);
  }
  const taskMatch = match.match(/^\/api\/tasks\/(\d+)$/);
  if (taskMatch && method === 'PATCH') {
    const list = tasks(); const id = Number(taskMatch[1]); const index = list.findIndex((t) => t.id === id);
    if (index < 0) return json({ error: 'Task not found' }, 404);
    list[index] = { ...list[index], ...body }; save(TASKS_KEY, list); return json(list[index]);
  }
  if (match === '/api/planner/generate' && method === 'POST') return json(planner(body));
  if (match === '/api/assistant/ask' && method === 'POST') return json(assistant(body));
  if (match === '/api/quiz/generate' && method === 'POST') return json(quiz(body));
  if (match === '/api/quiz/grade' && method === 'POST') return json(grade(body));
  if (match === '/api/notes' && method === 'GET') return json(notes());
  if (match === '/api/notes' && method === 'POST') {
    const list = notes(); const now = new Date().toISOString();
    const item: DemoNote = { id: Date.now(), title: body.title || 'Untitled note', content: body.content || '', summary: null, keyPoints: [], createdAt: now, updatedAt: now };
    list.unshift(item); save(NOTES_KEY, list); return json(item, 201);
  }
  const noteMatch = match.match(/^\/api\/notes\/(\d+)$/);
  if (noteMatch && method === 'PATCH') {
    const list = notes(); const id = Number(noteMatch[1]); const index = list.findIndex((n) => n.id === id);
    if (index < 0) return json({ error: 'Note not found' }, 404);
    list[index] = { ...list[index], ...body, updatedAt: new Date().toISOString() }; save(NOTES_KEY, list); return json(list[index]);
  }
  if (noteMatch && method === 'DELETE') {
    save(NOTES_KEY, notes().filter((n) => n.id !== Number(noteMatch[1]))); return new Response(null, { status: 204 });
  }
  if (match === '/api/notes/summarize' && method === 'POST') return json(summarize(String(body.content || '')));
  if (match === '/api/study-sessions' && method === 'POST') {
    const list = sessions(); const item = { id: Date.now(), minutes: Number(body.minutes || 25), subject: body.subject || 'General study', completedAt: new Date().toISOString() };
    list.unshift(item); save(SESSIONS_KEY, list); return json(item, 201);
  }
  if (match === '/api/adaptive/replan' && method === 'POST') return json(recovery());
  return json({ error: `Demo API route not found: ${method} ${match}` }, 404);
}

export function installDemoApi() {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    if (url.startsWith('/api/')) return handle(url, init);
    return originalFetch(input, init);
  };
}
