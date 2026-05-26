import { pgTable, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { attemptsTable } from "./attempts";
import { usersTable } from "./users";

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => attemptsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  totalScore: real("total_score").notNull().default(0),
  maxScore: real("max_score").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  wrongCount: integer("wrong_count").notNull().default(0),
  skippedCount: integer("skipped_count").notNull().default(0),
  accuracy: real("accuracy").notNull().default(0),
  timeTaken: integer("time_taken"),
  rank: integer("rank"),
  percentile: real("percentile"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({ id: true, createdAt: true });
export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof resultsTable.$inferSelect;
