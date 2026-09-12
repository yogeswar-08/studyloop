import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, notesTable, studySessionsTable, tasksTable } from "@workspace/db";
import {
  AskAssistantBody,
  AskAssistantResponse,
  CreateNoteBody,
  CreateNoteResponse,
  CreateStudySessionBody,
  CreateStudySessionResponse,
  CreateTaskBody,
  CreateTaskResponse,
  DeleteNoteParams,
  GeneratePlannerBody,
  GeneratePlannerResponse,
  GetDashboardResponse,
  ListNotesResponse,
  SummarizeNoteBody,
  SummarizeNoteResponse,
  UpdateNoteBody,
  UpdateNoteParams,
  UpdateNoteResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { askStudyLoopAI, parseAIJson } from "../lib/studyloop-ai";

const router: IRouter = Router();
type Tone = "orange" | "teal" | "plum";

function parseKeyPoints(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function serializeTask(task: typeof tasksTable.$inferSelect) {
  return {
    id: task.id,
    title: task.title,
    course: task.course,
    due: task.due,
    durationMinutes: task.durationMinutes,
    tone: task.tone as Tone,
    completed: task.completed,
  };
}

function serializeNote(note: typeof notesTable.$inferSelect) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    summary: note.summary,
    keyPoints: parseKeyPoints(note.keyPoints),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable).orderBy(tasksTable.sortOrder, tasksTable.id);
  const sessions = await db.select().from(studySessionsTable).orderBy(desc(studySessionsTable.completedAt));

  // Measure the last seven days from actual completed focus sessions.
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const weeklyMinutes = sessions
    .filter((session) => new Date(session.completedAt) >= weekStart)
    .reduce((total, session) => total + session.minutes, 0);
  // 300 minutes (5 hours) is a simple, achievable weekly reference target.
  const progress = Math.min(100, Math.round((weeklyMinutes / 300) * 100));

  // Count consecutive calendar days with at least one completed focus session.
  const sessionDays = new Set(
    sessions.map((session) => {
      const date = new Date(session.completedAt);
      date.setHours(0, 0, 0, 0);
      return date.toISOString().slice(0, 10);
    }),
  );
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  // A streak may continue from yesterday if the student has not studied yet today.
  if (!sessionDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (sessionDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const upcoming = tasks
    .filter((task) => !task.completed && task.due !== "Whenever you need it")
    .slice(0, 3)
    .map((task) => {
      const isTomorrow = /tomorrow/i.test(task.due);
      const date = new Date(now);
      if (isTomorrow) date.setDate(date.getDate() + 1);
      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        title: task.title,
        relative: isTomorrow ? "tomorrow" : task.due.toLowerCase().replace(/^due\s*/i, ""),
        tone: task.tone as Tone,
      };
    });

  const data = {
    tasks: tasks.map(serializeTask),
    weeklyProgress: progress,
    streak,
    upcoming,
  };
  res.json(GetDashboardResponse.parse(data));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [task] = await db.insert(tasksTable).values({
    title: parsed.data.title,
    course: parsed.data.course ?? "Personal",
    due: parsed.data.due ?? "Whenever you need it",
    durationMinutes: parsed.data.durationMinutes ?? 25,
    tone: parsed.data.tone ?? "teal",
    sortOrder: 99,
  }).returning();
  res.status(201).json(CreateTaskResponse.parse(serializeTask(task)));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid task update" });
    return;
  }
  const [task] = await db.update(tasksTable).set(body.data).where(eq(tasksTable.id, params.data.id)).returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(UpdateTaskResponse.parse(serializeTask(task)));
});

router.get("/notes", async (_req, res): Promise<void> => {
  const notes = await db.select().from(notesTable).orderBy(desc(notesTable.updatedAt));
  res.json(ListNotesResponse.parse(notes.map(serializeNote)));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db.insert(notesTable).values({
    title: parsed.data.title,
    content: parsed.data.content,
  }).returning();
  res.status(201).json(CreateNoteResponse.parse(serializeNote(note)));
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  const body = UpdateNoteBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid note update" });
    return;
  }
  const updates = {
    ...(body.data.title !== undefined ? { title: body.data.title } : {}),
    ...(body.data.content !== undefined ? { content: body.data.content } : {}),
    ...(body.data.summary !== undefined ? { summary: body.data.summary } : {}),
    ...(body.data.keyPoints !== undefined ? { keyPoints: JSON.stringify(body.data.keyPoints) } : {}),
    updatedAt: new Date(),
  };
  const [note] = await db.update(notesTable).set(updates).where(eq(notesTable.id, params.data.id)).returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(UpdateNoteResponse.parse(serializeNote(note)));
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [note] = await db.delete(notesTable).where(eq(notesTable.id, params.data.id)).returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/adaptive/replan", async (req, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable).orderBy(tasksTable.sortOrder, tasksTable.id);
  const sessions = await db.select().from(studySessionsTable).orderBy(desc(studySessionsTable.completedAt)).limit(20);
  const openTasks = tasks.filter((task) => !task.completed).slice(0, 20).map((task) => ({
    title: task.title,
    course: task.course,
    due: task.due,
    minutes: task.durationMinutes,
  }));
  const recentMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const prompt = `Rebuild this student's study plan from their CURRENT reality, not an ideal schedule. Open tasks: ${JSON.stringify(openTasks)}. Recent completed focus sessions: ${recentMinutes} minutes across ${sessions.length} sessions. The student says they are behind and needs a practical recovery plan. Return JSON with status ("on_track" or "recovery"), headline, realityScore (0-100), diagnosis, today (array of {title, minutes, reason}), tomorrow (array of {title, minutes, reason}), and rule (one short sentence explaining how the plan will adapt next time). Keep total study time realistic and prioritize overdue/urgent work. Never invent tasks that are not in the list.`;
  const ai = parseAIJson<{
    status: "on_track" | "recovery";
    headline: string;
    realityScore: number;
    diagnosis: string;
    today: Array<{ title: string; minutes: number; reason: string }>;
    tomorrow: Array<{ title: string; minutes: number; reason: string }>;
    rule: string;
  }>(await askStudyLoopAI("You are StudyLoop's adaptive recovery coach. Return only valid JSON.", prompt));
  if (!ai || !Array.isArray(ai.today) || !Array.isArray(ai.tomorrow)) {
    res.status(503).json({ error: "Adaptive AI is unavailable. Configure OPENAI_API_KEY and try again." });
    return;
  }
  res.json({
    ...ai,
    realityScore: Math.max(0, Math.min(100, Math.round(Number(ai.realityScore) || 0))),
    today: ai.today.slice(0, 5),
    tomorrow: ai.tomorrow.slice(0, 5),
  });
});

router.post("/planner/generate", async (req, res): Promise<void> => {
  const parsed = GeneratePlannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { subject, topics, hoursPerDay, daysUntilExam, difficulty } = parsed.data;
  const prompt = `Create a realistic study plan for a ${difficulty} college student. Subject: ${subject}. Topics: ${topics}. Available time: ${hoursPerDay} hours per day. Exam in ${daysUntilExam} days. Respect the available daily time, break large topics into smaller sessions, prioritize difficult topics, include active recall and practice problems, and leave time for revision. Return JSON with title, overview, days (array of day, focus, minutes, action), and tips (array of strings). Limit days to the next 5 study days.`;
  const ai = parseAIJson<{
    title: string;
    overview: string;
    days: Array<{ day: string; focus: string; minutes: number; action: string }>;
    tips: string[];
  }>(await askStudyLoopAI("You are StudyLoop, a warm and practical academic coach. Return only valid JSON.", prompt));
  if (!ai) {
    res.status(503).json({ error: "AI service is unavailable. Configure OPENAI_API_KEY and try again." });
    return;
  }
  res.json(GeneratePlannerResponse.parse(ai));
});

router.post("/assistant/ask", async (req, res): Promise<void> => {
  const parsed = AskAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { question, mode } = parsed.data;
  const prompt = `Student request mode: ${mode}. Student question: ${question}. Return JSON with answer, takeaways (array of 3 short points), and practiceQuestion. Explain simply, use one concrete example, and avoid jargon unless you define it.`;
  const ai = parseAIJson<{
    answer: string;
    takeaways: string[];
    practiceQuestion: string;
  }>(await askStudyLoopAI("You are a patient tutor for a first-year computer science student. Return only valid JSON.", prompt));
  if (!ai) {
    res.status(503).json({ error: "AI service is unavailable. Configure OPENAI_API_KEY and try again." });
    return;
  }
  res.json(AskAssistantResponse.parse(ai));
});


router.post("/quiz/generate", async (req, res): Promise<void> => {
  const { subject, topics, difficulty = "beginner", count = 5 } = req.body ?? {};
  if (typeof subject !== "string" || !subject.trim() || typeof topics !== "string" || !topics.trim()) {
    res.status(400).json({ error: "Subject and topics are required" });
    return;
  }
  const safeCount = Math.min(8, Math.max(3, Number(count) || 5));
  const prompt = `Create ${safeCount} multiple-choice active-recall questions for a college student. Subject: ${subject}. Topics: ${topics}. Difficulty: ${difficulty}. Questions must test understanding, not trivia. Include a mix of concept, application, and one common-mistake question. Return JSON with title, questions (array of question, options [4 strings], correctIndex, explanation, topic). Keep explanations short and accurate. Do not use trick questions.`;
  const ai = parseAIJson<{
    title: string;
    questions: Array<{ question: string; options: string[]; correctIndex: number; explanation: string; topic: string }>;
  }>(await askStudyLoopAI("You are StudyLoop's exam coach. Generate fair, educational multiple-choice questions. Return only valid JSON.", prompt));
  if (!ai || !Array.isArray(ai.questions) || ai.questions.length < 3) {
    res.status(502).json({ error: "AI returned an incomplete quiz. Please try generating the quiz again." });
    return;
  }
  const result = ai;
  const questions = result.questions.slice(0, safeCount).map((item) => {
    const options = Array.isArray(item.options) ? item.options.slice(0, 4).map(String) : [];
    const correctIndex = Number(item.correctIndex);
    const topic = typeof item.topic === "string" && item.topic.trim() ? item.topic.trim() : topics.trim();

    if (
      typeof item.question !== "string" ||
      !item.question.trim() ||
      options.length !== 4 ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex > 3 ||
      typeof item.explanation !== "string" ||
      !item.explanation.trim()
    ) {
      return null;
    }

    return {
      question: item.question.trim(),
      options,
      correctIndex,
      explanation: item.explanation.trim(),
      topic,
    };
  });

  const validQuestions = questions.filter((question): question is NonNullable<typeof question> => question !== null);

  if (validQuestions.length < 3 || validQuestions.length !== questions.length) {
    res.status(502).json({ error: "AI returned an incomplete quiz. Please try generating the quiz again." });
    return;
  }

  res.json({
    title: result.title,
    questions: validQuestions,
  });
});

router.post("/quiz/grade", async (req, res): Promise<void> => {
  const { questions, answers } = req.body ?? {};
  if (!Array.isArray(questions) || !Array.isArray(answers) || questions.length === 0 || questions.length !== answers.length) {
    res.status(400).json({ error: "Questions and answers are required" });
    return;
  }
  const normalized = questions.map((question: any, index: number) => ({
    question: String(question.question ?? ""),
    options: Array.isArray(question.options) ? question.options.map(String) : [],
    correctIndex: Number(question.correctIndex),
    explanation: String(question.explanation ?? ""),
    topic: String(question.topic ?? "General"),
    answerIndex: Number(answers[index]),
  }));
  const score = normalized.reduce((total, item) => total + (item.answerIndex === item.correctIndex ? 1 : 0), 0);
  const missed = normalized.filter((item) => item.answerIndex !== item.correctIndex);
  const weakTopics = [...new Set(missed.map((item) => item.topic))].slice(0, 3);
  const prompt = `Review this student's quiz performance. Score: ${score}/${normalized.length}. Missed topics: ${weakTopics.join(", ") || "none"}. Return JSON with headline, feedback, nextStep, and weakTopics (array of strings). Encourage learning from mistakes rather than judging the student.`;
  const ai = parseAIJson<{ headline: string; feedback: string; nextStep: string; weakTopics: string[] }>(
    await askStudyLoopAI("You are a supportive academic coach. Keep feedback practical and concise. Return only valid JSON.", prompt),
  );
  const percentage = Math.round((score / normalized.length) * 100);
  if (!ai) {
    res.status(503).json({ error: "AI feedback is unavailable. Configure the AI service and try again." });
    return;
  }

  res.json({
    score,
    total: normalized.length,
    percentage,
    headline: ai.headline,
    feedback: ai.feedback,
    nextStep: ai.nextStep,
    weakTopics: ai.weakTopics,
    missed: missed.map((item) => ({
      question: item.question,
      correctAnswer: item.options[item.correctIndex] ?? "Review this question",
      explanation: item.explanation,
      topic: item.topic,
    })),
  });
});

router.post("/notes/summarize", async (req, res): Promise<void> => {
  const parsed = SummarizeNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const prompt = `Summarize this student note. Return JSON with summary and keyPoints (array of 3-5 concise strings).\n\n${parsed.data.content}`;
  const ai = parseAIJson<{ summary: string; keyPoints: string[] }>(
    await askStudyLoopAI("You turn messy study notes into clear, accurate revision material. Return only valid JSON.", prompt),
  );
  if (!ai) {
    res.status(503).json({ error: "AI service is unavailable. Configure OPENAI_API_KEY and try again." });
    return;
  }
  res.json(SummarizeNoteResponse.parse(ai));
});

router.post("/study-sessions", async (req, res): Promise<void> => {
  const parsed = CreateStudySessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db.insert(studySessionsTable).values({
    minutes: parsed.data.minutes,
    subject: parsed.data.subject ?? "General study",
  }).returning();
  res.status(201).json(CreateStudySessionResponse.parse(session));
});

export default router;