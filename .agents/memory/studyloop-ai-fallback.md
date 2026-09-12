# StudyLoop AI behavior

StudyLoop must not use hardcoded study-content fallbacks. AI-generated planner, assistant, quiz, and note-summary content must be based on current user input and the configured AI service. When AI is unavailable or returns incomplete data, return an actionable API error instead of fabricated content.
