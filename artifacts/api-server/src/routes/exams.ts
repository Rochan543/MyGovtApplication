import { Router, type IRouter } from "express";
import { db, examsTable, sectionsTable, questionsTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/exams", authenticate, async (req, res): Promise<void> => {
  const { active, examType, search } = req.query as { active?: string; examType?: string; search?: string };

  const exams = await db.select().from(examsTable);
  let filtered = exams;
  if (active !== undefined) filtered = filtered.filter(e => e.active === (active === "true"));
  if (examType) filtered = filtered.filter(e => e.examType === examType);
  if (search) filtered = filtered.filter(e => e.title.toLowerCase().includes(search.toLowerCase()));

  const withCounts = await Promise.all(
    filtered.map(async (exam) => {
      const [{ count: qCount }] = await db.select({ count: sql<number>`count(*)` }).from(questionsTable).where(eq(questionsTable.examId, exam.id));
      return { ...exam, questionCount: Number(qCount), attemptCount: 0 };
    })
  );

  res.json(withCounts);
});

router.post("/exams", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { title, description, examType, duration, totalMarks, negativeMarks, instructions, active, hasSectionalTimer, startDate, endDate } = req.body;
  if (!title || !examType || !duration || !totalMarks) {
    res.status(400).json({ error: "title, examType, duration, totalMarks are required" });
    return;
  }

  const [exam] = await db.insert(examsTable).values({
    title, description, examType, duration, totalMarks,
    negativeMarks: negativeMarks ?? 0,
    instructions, active: active ?? false,
    hasSectionalTimer: hasSectionalTimer ?? false,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }).returning();

  res.status(201).json({ ...exam, questionCount: 0, attemptCount: 0 });
});

router.get("/exams/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }

  const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.examId, id));
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, id));

  res.json({ ...exam, sections, questions });
});

router.patch("/exams/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, description, examType, duration, totalMarks, negativeMarks, instructions, active, hasSectionalTimer, startDate, endDate } = req.body;

  const [exam] = await db.update(examsTable).set({
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(examType !== undefined && { examType }),
    ...(duration !== undefined && { duration }),
    ...(totalMarks !== undefined && { totalMarks }),
    ...(negativeMarks !== undefined && { negativeMarks }),
    ...(instructions !== undefined && { instructions }),
    ...(active !== undefined && { active }),
    ...(hasSectionalTimer !== undefined && { hasSectionalTimer }),
    ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
    ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
  }).where(eq(examsTable.id, id)).returning();

  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  res.json({ ...exam, questionCount: null, attemptCount: null });
});

router.delete("/exams/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [exam] = await db.delete(examsTable).where(eq(examsTable.id, id)).returning();
  if (!exam) { res.status(404).json({ error: "Exam not found" }); return; }
  res.sendStatus(204);
});

router.patch("/exams/:id/publish", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [current] = await db.select().from(examsTable).where(eq(examsTable.id, id));
  if (!current) { res.status(404).json({ error: "Exam not found" }); return; }

  const [exam] = await db.update(examsTable).set({ active: !current.active }).where(eq(examsTable.id, id)).returning();
  res.json({ ...exam, questionCount: null, attemptCount: null });
});

export default router;
