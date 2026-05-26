import { Router, type IRouter } from "express";
import { db, sectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/sections", authenticate, async (req, res): Promise<void> => {
  const { examId } = req.query as { examId?: string };
  const sections = examId
    ? await db.select().from(sectionsTable).where(eq(sectionsTable.examId, parseInt(examId, 10)))
    : await db.select().from(sectionsTable);
  res.json(sections);
});

router.post("/sections", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { name, examId, duration, order } = req.body;
  if (!name || !examId || duration === undefined) {
    res.status(400).json({ error: "name, examId, duration are required" });
    return;
  }
  const [section] = await db.insert(sectionsTable).values({ name, examId, duration, order: order ?? 0 }).returning();
  res.status(201).json(section);
});

router.patch("/sections/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, duration, order } = req.body;
  const [section] = await db.update(sectionsTable).set({
    ...(name !== undefined && { name }),
    ...(duration !== undefined && { duration }),
    ...(order !== undefined && { order }),
  }).where(eq(sectionsTable.id, id)).returning();
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }
  res.json(section);
});

router.delete("/sections/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [section] = await db.delete(sectionsTable).where(eq(sectionsTable.id, id)).returning();
  if (!section) { res.status(404).json({ error: "Section not found" }); return; }
  res.sendStatus(204);
});

export default router;
