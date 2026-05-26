import { Router, type IRouter } from "express";
import { db, topicMocksTable, topicsTable, subjectsTable, questionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/topic-mocks", authenticate, async (req, res): Promise<void> => {
  const { topicId, published } = req.query as { topicId?: string; published?: string };

  const rows = await db.select({
    id: topicMocksTable.id,
    title: topicMocksTable.title,
    topicId: topicMocksTable.topicId,
    topicName: topicsTable.name,
    subjectName: subjectsTable.name,
    duration: topicMocksTable.duration,
    totalMarks: topicMocksTable.totalMarks,
    negativeMarks: topicMocksTable.negativeMarks,
    published: topicMocksTable.published,
    createdAt: topicMocksTable.createdAt,
  }).from(topicMocksTable)
    .leftJoin(topicsTable, eq(topicMocksTable.topicId, topicsTable.id))
    .leftJoin(subjectsTable, eq(topicsTable.subjectId, subjectsTable.id));

  let filtered = rows;
  if (topicId) filtered = filtered.filter(r => r.topicId === parseInt(topicId, 10));
  if (published !== undefined) filtered = filtered.filter(r => r.published === (published === "true"));

  const withCounts = filtered.map(r => ({ ...r, questionCount: null }));
  res.json(withCounts);
});

router.post("/topic-mocks", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { title, topicId, duration, totalMarks, negativeMarks, published } = req.body;
  if (!title || !topicId || !duration || !totalMarks) {
    res.status(400).json({ error: "title, topicId, duration, totalMarks are required" });
    return;
  }
  const [mock] = await db.insert(topicMocksTable).values({
    title, topicId, duration, totalMarks, negativeMarks: negativeMarks ?? 0, published: published ?? false,
  }).returning();
  res.status(201).json({ ...mock, topicName: null, subjectName: null, questionCount: null });
});

router.get("/topic-mocks/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [mock] = await db.select({
    id: topicMocksTable.id,
    title: topicMocksTable.title,
    topicId: topicMocksTable.topicId,
    topicName: topicsTable.name,
    subjectName: subjectsTable.name,
    duration: topicMocksTable.duration,
    totalMarks: topicMocksTable.totalMarks,
    negativeMarks: topicMocksTable.negativeMarks,
    published: topicMocksTable.published,
    createdAt: topicMocksTable.createdAt,
  }).from(topicMocksTable)
    .leftJoin(topicsTable, eq(topicMocksTable.topicId, topicsTable.id))
    .leftJoin(subjectsTable, eq(topicsTable.subjectId, subjectsTable.id))
    .where(eq(topicMocksTable.id, id));

  if (!mock) { res.status(404).json({ error: "Topic mock not found" }); return; }
  res.json({ ...mock, questionCount: null });
});

router.patch("/topic-mocks/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, topicId, duration, totalMarks, negativeMarks, published } = req.body;
  const [mock] = await db.update(topicMocksTable).set({
    ...(title !== undefined && { title }),
    ...(topicId !== undefined && { topicId }),
    ...(duration !== undefined && { duration }),
    ...(totalMarks !== undefined && { totalMarks }),
    ...(negativeMarks !== undefined && { negativeMarks }),
    ...(published !== undefined && { published }),
  }).where(eq(topicMocksTable.id, id)).returning();
  if (!mock) { res.status(404).json({ error: "Topic mock not found" }); return; }
  res.json({ ...mock, topicName: null, subjectName: null, questionCount: null });
});

router.delete("/topic-mocks/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [mock] = await db.delete(topicMocksTable).where(eq(topicMocksTable.id, id)).returning();
  if (!mock) { res.status(404).json({ error: "Topic mock not found" }); return; }
  res.sendStatus(204);
});

router.patch("/topic-mocks/:id/publish", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [current] = await db.select().from(topicMocksTable).where(eq(topicMocksTable.id, id));
  if (!current) { res.status(404).json({ error: "Topic mock not found" }); return; }
  const [mock] = await db.update(topicMocksTable).set({ published: !current.published }).where(eq(topicMocksTable.id, id)).returning();
  res.json({ ...mock, topicName: null, subjectName: null, questionCount: null });
});

export default router;
