# StudyLoop — iQOO final build

## Added
- AI Quiz Lab: generates short exam-style active-recall MCQs and grades the attempt.
- Gap detection: identifies topics missed and gives a concrete next study step.
- Dashboard quick action and navigation entry for Quiz Lab.
- Quiz generation and feedback do not use hardcoded study-content fallbacks; unavailable or incomplete AI responses are surfaced as errors.

## Existing fixes retained
- Real focus-session based weekly progress and streak.
- Dynamic dates instead of template dates.
- Removed Alex Morgan / Design template identity.
- Task → Focus connection.
- 1-minute focus option for reliable hackathon demo.
- Planner prompt now respects available time, difficulty, active recall and revision.
- Notes are branded as an AI revision sheet.

## Deliberately not added
- Authentication, social feed, calendar sync, or unnecessary external integrations. These increase demo risk without improving the core student-learning story.


## Hackathon compliance note

The iQOO Hackathon 2026 rules require original work written during the event window and explicitly prohibit submitting a pre-built product. This repository is therefore a development/reference baseline only; it must not be submitted unchanged as the hackathon build. The event version must be implemented and iterated during the official build window. Open-source libraries/frameworks are allowed with attribution.
