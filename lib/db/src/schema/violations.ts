import { pgTable, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { attemptsTable } from "./attempts";

export const violationTypeEnum = pgEnum("violation_type", [
  "TAB_SWITCH",
  "FULLSCREEN_EXIT",
  "WINDOW_BLUR",
  "COPY_PASTE",
  "RIGHT_CLICK",
  "DEV_TOOLS",
]);

export const violationsTable = pgTable("exam_violations", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => attemptsTable.id, { onDelete: "cascade" }),
  violationType: violationTypeEnum("violation_type").notNull(),
  count: integer("count").notNull().default(1),
  autoSubmitted: boolean("auto_submitted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertViolationSchema = createInsertSchema(violationsTable).omit({ id: true, createdAt: true });
export type InsertViolation = z.infer<typeof insertViolationSchema>;
export type Violation = typeof violationsTable.$inferSelect;
