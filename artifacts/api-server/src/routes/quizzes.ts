import { Router, type IRouter } from "express";
import { db, quizzesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/quizzes", authenticate, async (req, res): Promise<void> => {
  const { quizType, published } = req.query as { quizType?: string; published?: string };
  let quizzes = await db.select().from(quizzesTable);
  if (quizType) quizzes = quizzes.filter(q => q.quizType === quizType);
  if (published !== undefined) quizzes = quizzes.filter(q => q.published === (published === "true"));
  res.json(quizzes.map(q => ({ ...q, questionCount: null })));
});

router.post("/quizzes", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { title, quizType, duration, totalMarks, negativeMarks, published, scheduledAt } = req.body;
  if (!title || !quizType || !duration || !totalMarks) {
    res.status(400).json({ error: "title, quizType, duration, totalMarks are required" });
    return;
  }
  const [quiz] = await db.insert(quizzesTable).values({
    title, quizType, duration, totalMarks, negativeMarks: negativeMarks ?? 0,
    published: published ?? false,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  }).returning();
  res.status(201).json({ ...quiz, questionCount: null });
});

router.get("/quizzes/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  res.json({ ...quiz, questionCount: null });
});

router.patch("/quizzes/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, quizType, duration, totalMarks, negativeMarks, published, scheduledAt } = req.body;
  const [quiz] = await db.update(quizzesTable).set({
    ...(title !== undefined && { title }),
    ...(quizType !== undefined && { quizType }),
    ...(duration !== undefined && { duration }),
    ...(totalMarks !== undefined && { totalMarks }),
    ...(negativeMarks !== undefined && { negativeMarks }),
    ...(published !== undefined && { published }),
    ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
  }).where(eq(quizzesTable.id, id)).returning();
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  res.json({ ...quiz, questionCount: null });
});

router.delete("/quizzes/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [quiz] = await db.delete(quizzesTable).where(eq(quizzesTable.id, id)).returning();
  if (!quiz) { res.status(404).json({ error: "Quiz not found" }); return; }
  res.sendStatus(204);
});

router.patch("/quizzes/:id/publish", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [current] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, id));
  if (!current) { res.status(404).json({ error: "Quiz not found" }); return; }
  const [quiz] = await db.update(quizzesTable).set({ published: !current.published }).where(eq(quizzesTable.id, id)).returning();
  res.json({ ...quiz, questionCount: null });
});

export default router;
