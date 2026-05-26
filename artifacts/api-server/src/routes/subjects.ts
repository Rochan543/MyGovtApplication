import { Router, type IRouter } from "express";
import { db, subjectsTable, topicsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/subjects", authenticate, async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable);
  res.json(subjects);
});

router.post("/subjects", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [subject] = await db.insert(subjectsTable).values({ name, description }).returning();
  res.status(201).json(subject);
});

router.patch("/subjects/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, description } = req.body;
  const [subject] = await db.update(subjectsTable).set({
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
  }).where(eq(subjectsTable.id, id)).returning();
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
  res.json(subject);
});

router.delete("/subjects/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [subject] = await db.delete(subjectsTable).where(eq(subjectsTable.id, id)).returning();
  if (!subject) { res.status(404).json({ error: "Subject not found" }); return; }
  res.sendStatus(204);
});

// TOPICS
router.get("/topics", authenticate, async (req, res): Promise<void> => {
  const { subjectId } = req.query as { subjectId?: string };
  const topics = subjectId
    ? await db.select({ id: topicsTable.id, name: topicsTable.name, subjectId: topicsTable.subjectId, subjectName: subjectsTable.name, createdAt: topicsTable.createdAt })
        .from(topicsTable).leftJoin(subjectsTable, eq(topicsTable.subjectId, subjectsTable.id))
        .where(eq(topicsTable.subjectId, parseInt(subjectId, 10)))
    : await db.select({ id: topicsTable.id, name: topicsTable.name, subjectId: topicsTable.subjectId, subjectName: subjectsTable.name, createdAt: topicsTable.createdAt })
        .from(topicsTable).leftJoin(subjectsTable, eq(topicsTable.subjectId, subjectsTable.id));
  res.json(topics);
});

router.post("/topics", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { name, subjectId } = req.body;
  if (!name || !subjectId) { res.status(400).json({ error: "name and subjectId are required" }); return; }
  const [topic] = await db.insert(topicsTable).values({ name, subjectId }).returning();
  res.status(201).json({ ...topic, subjectName: null });
});

router.patch("/topics/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, subjectId } = req.body;
  const [topic] = await db.update(topicsTable).set({
    ...(name !== undefined && { name }),
    ...(subjectId !== undefined && { subjectId }),
  }).where(eq(topicsTable.id, id)).returning();
  if (!topic) { res.status(404).json({ error: "Topic not found" }); return; }
  res.json({ ...topic, subjectName: null });
});

router.delete("/topics/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [topic] = await db.delete(topicsTable).where(eq(topicsTable.id, id)).returning();
  if (!topic) { res.status(404).json({ error: "Topic not found" }); return; }
  res.sendStatus(204);
});

export default router;
