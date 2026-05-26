import { Router, type IRouter } from "express";
import { db, violationsTable, attemptsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";

const router: IRouter = Router();

router.post("/violations", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const { attemptId, violationType, autoSubmit } = req.body;
  if (!attemptId || !violationType) {
    res.status(400).json({ error: "attemptId and violationType are required" });
    return;
  }

  // Check if violation already exists for this type in this attempt
  const existing = await db.select().from(violationsTable)
    .where(eq(violationsTable.attemptId, attemptId));
  const existingForType = existing.find(v => v.violationType === violationType);

  let violation;
  if (existingForType) {
    [violation] = await db.update(violationsTable)
      .set({ count: existingForType.count + 1, autoSubmitted: autoSubmit ?? false })
      .where(eq(violationsTable.id, existingForType.id))
      .returning();
  } else {
    [violation] = await db.insert(violationsTable).values({
      attemptId, violationType, count: 1, autoSubmitted: autoSubmit ?? false,
    }).returning();
  }

  if (autoSubmit) {
    await db.update(attemptsTable)
      .set({ status: "AUTO_SUBMITTED", submittedAt: new Date() })
      .where(eq(attemptsTable.id, attemptId));
  }

  res.status(201).json(violation);
});

router.get("/violations/:attemptId", authenticate, async (req, res): Promise<void> => {
  const attemptId = parseInt(Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId, 10);
  const violations = await db.select().from(violationsTable).where(eq(violationsTable.attemptId, attemptId));
  res.json(violations);
});

export default router;
