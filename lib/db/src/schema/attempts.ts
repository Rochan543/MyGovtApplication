import { pgTable, text, serial, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const entityTypeEnum = pgEnum("entity_type", ["EXAM", "QUIZ", "TOPIC_MOCK"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["IN_PROGRESS", "SUBMITTED", "AUTO_SUBMITTED"]);

export const attemptsTable = pgTable("attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  entityType: entityTypeEnum("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  status: attemptStatusEnum("status").notNull().default("IN_PROGRESS"),
  currentSection: integer("current_section").default(0),
  timeRemaining: integer("time_remaining"),
  answers: jsonb("answers").default([]),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAttemptSchema = createInsertSchema(attemptsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAttempt = z.infer<typeof insertAttemptSchema>;
export type Attempt = typeof attemptsTable.$inferSelect;
