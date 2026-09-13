// PATCH REQUIRED: Replace the Fast Learning AI request's out-of-scope localFetch with window.fetch.
// Please apply this exact change in the existing file:
// const response = await localFetch('/api/assistant/ask', {
// becomes
// const response = await window.fetch('/api/assistant/ask', {
