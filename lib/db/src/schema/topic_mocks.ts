import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { topicsTable } from "./topics";

export const topicMocksTable = pgTable("topic_mocks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  duration: integer("duration").notNull(),
  totalMarks: integer("total_marks").notNull(),
  negativeMarks: real("negative_marks").notNull().default(0),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTopicMockSchema = createInsertSchema(topicMocksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTopicMock = z.infer<typeof insertTopicMockSchema>;
export type TopicMock = typeof topicMocksTable.$inferSelect;
