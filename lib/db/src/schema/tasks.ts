import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("study_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  course: text("course").notNull().default("Personal"),
  due: text("due").notNull().default("Whenever you need it"),
  durationMinutes: integer("duration_minutes").notNull().default(25),
  tone: text("tone").notNull().default("teal"),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;