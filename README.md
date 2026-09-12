# StudyLoop

**Created by Yogeswar**

StudyLoop is an AI-powered student learning and productivity app. It helps students turn their own subjects, topics, notes, questions, and study sessions into personalized plans, explanations, quizzes, summaries, and focus insights.

## Hackathon / AI behavior

- AI-generated study content comes from the current user input and the configured AI service.
- No hardcoded quiz questions, subject answers, note summaries, or planner outputs are used as fallbacks.
- If the AI service is unavailable or returns incomplete structured data, the app reports an error instead of presenting fabricated study content.
- Quiz grading itself is computed from the questions generated for the current session.

## Creator

**Yogeswar** is the creator of this StudyLoop project.


## Hackathon compliance

For iQOO Hackathon 2026, do not submit this repository as a pre-built product. The published rules require original work written during the event window. Use this only as a learning/reference baseline and rebuild or substantially implement the submission during the official build window.

## Adaptive Recovery Loop

StudyLoop now includes an **Adaptive Recovery Loop** at `/recovery`. It uses the student's current unfinished tasks and recent focus-session history to generate a practical two-day recovery plan. The feature is designed around the product's core differentiator: plans should adapt to real student behavior rather than assuming a perfect schedule.

### Core product story

**Plan → Study → Measure → Detect gaps → Replan → Repeat**

The recovery coach includes a Study Reality Score, a diagnosis, today's and tomorrow's recommended work, and an adaptive rule. It is intentionally grounded in the student's actual stored tasks and focus history and instructs the AI not to invent tasks.

> Hackathon note: this repository is a development/reference prototype. For the iQOO event, rebuild the final implementation during the permitted event window and follow the event's original-work requirements.
