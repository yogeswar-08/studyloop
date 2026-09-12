import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Serve the production React build from the same public Render service.
const frontendDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../studyloop/dist/public",
);
app.use(express.static(frontendDist));
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendDist, "index.html"), (err) => {
      if (err) next(err);
    });
    return;
  }
  next();
});

app.listen(port, () => logger.info({ port }, "StudyLoop production server listening"));
