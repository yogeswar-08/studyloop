# StudyLoop — Hackathon Product Blueprint

## One-line pitch

**StudyLoop is an adaptive AI academic copilot that continuously rebuilds a student's study plan from what they actually finish, miss, and struggle with.**

## The differentiator

Most study planners create a timetable once. StudyLoop closes the loop:

**Plan → Study → Measure → Detect gaps → Replan → Repeat**

The product should be demonstrated through a realistic failure scenario: a student misses a session, performs poorly on a topic quiz, taps **"I'm behind — rebuild my plan"**, and receives a smaller, evidence-based recovery plan.

## Feature stack

1. Adaptive Planner — creates a right-sized plan from subject, topics, time, deadline, and difficulty.
2. Recovery Loop — uses unfinished tasks + recent focus history to rebuild the next two days.
3. Study Reality Score — communicates whether the current workload matches actual study behavior.
4. Weakness Detection — quiz results identify topics to revisit.
5. Notes → Revision — turns notes into concise summaries and key points.
6. AI Tutor — gives simple explanations, takeaways, and a practice question.
7. Focus Room — logs real study time rather than pretending tasks were completed.
8. Mobile-first PWA — optimized for phone use.

## 30-hour build priority

### Must ship
- Adaptive Recovery Loop
- Task creation/completion
- Focus timer + session logging
- Quiz + weakness feedback
- Clean mobile UI
- Reliable demo data entered by the team during the event

### If time remains
- Push notifications
- Installable PWA polish
- Office Kit integration/export
- Local/open-source model integration if the team can support it reliably
- More granular mastery history

## Demo script

1. Create 3 real student tasks with different urgency.
2. Start a focus session and log it.
3. Generate a short quiz.
4. Submit the quiz and show a weak topic.
5. Leave one task incomplete to simulate a real day.
6. Open **Recovery Loop**.
7. Press **I'm behind — rebuild my plan**.
8. Show the Reality Score, diagnosis, and two-day recovery plan.
9. Explain that the next plan is generated from behavior, not from a static timetable.

## Important compliance

Do not present this pre-event prototype as the final iQOO submission. Rebuild/write the final submission during the event window according to the official rules, while using this project only as preparation/reference.
