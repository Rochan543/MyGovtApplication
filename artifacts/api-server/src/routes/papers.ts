import { Router, type IRouter } from "express";
import { db, papersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/papers", authenticate, async (req, res): Promise<void> => {
  const { examType, year } = req.query as { examType?: string; year?: string };
  let papers = await db.select().from(papersTable);
  if (examType) papers = papers.filter(p => p.examType === examType);
  if (year) papers = papers.filter(p => p.year === parseInt(year, 10));
  res.json(papers);
});

router.post("/papers", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { title, examType, year, fileUrl, fileType, fileName, description } = req.body;
  if (!title || !examType || !fileUrl || !fileType || !fileName) {
    res.status(400).json({ error: "title, examType, fileUrl, fileType, fileName are required" });
    return;
  }
  const [paper] = await db.insert(papersTable).values({
    title, examType, year: year ?? null, fileUrl, fileType, fileName, description,
  }).returning();
  res.status(201).json(paper);
});

router.get("/papers/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [paper] = await db.select().from(papersTable).where(eq(papersTable.id, id));
  if (!paper) { res.status(404).json({ error: "Paper not found" }); return; }
  res.json(paper);
});

router.delete("/papers/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [paper] = await db.delete(papersTable).where(eq(papersTable.id, id)).returning();
  if (!paper) { res.status(404).json({ error: "Paper not found" }); return; }
  res.sendStatus(204);
});

export default router;
