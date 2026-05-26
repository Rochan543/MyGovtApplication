import { Router, type IRouter } from "express";
import { db, feedsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/feeds", authenticate, async (req, res): Promise<void> => {
  const { published } = req.query as { published?: string };
  let feeds = await db.select().from(feedsTable).orderBy(feedsTable.createdAt);
  if (published === "true") feeds = feeds.filter(f => f.isPublished);
  res.json(feeds.reverse());
});

router.post("/feeds", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { title, description, imageUrl, isPublished } = req.body;
  if (!title || !description) {
    res.status(400).json({ error: "title and description are required" });
    return;
  }
  const [feed] = await db.insert(feedsTable).values({
    title,
    description,
    imageUrl: imageUrl ?? null,
    isPublished: isPublished ?? false,
  }).returning();
  res.status(201).json(feed);
});

router.get("/feeds/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [feed] = await db.select().from(feedsTable).where(eq(feedsTable.id, id));
  if (!feed) { res.status(404).json({ error: "Feed not found" }); return; }
  res.json(feed);
});

router.patch("/feeds/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { title, description, imageUrl, isPublished } = req.body;
  const [feed] = await db.update(feedsTable).set({
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(imageUrl !== undefined && { imageUrl }),
    ...(isPublished !== undefined && { isPublished }),
  }).where(eq(feedsTable.id, id)).returning();
  if (!feed) { res.status(404).json({ error: "Feed not found" }); return; }
  res.json(feed);
});

router.delete("/feeds/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [feed] = await db.delete(feedsTable).where(eq(feedsTable.id, id)).returning();
  if (!feed) { res.status(404).json({ error: "Feed not found" }); return; }
  res.sendStatus(204);
});

router.post(
  "/feeds/:id/like",
  authenticate,
  async (req, res): Promise<void> => {

    const id = parseInt(
  Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id,
  10
);

    const [feed] = await db
      .select()
      .from(feedsTable)
      .where(eq(feedsTable.id, id));

    if (!feed) {
      res.status(404).json({
        error: "Feed not found",
      });

      return;
    }

    const [updated] = await db
      .update(feedsTable)
      .set({
        likes: feed.likes + 1,
      })
      .where(eq(feedsTable.id, id))
      .returning();

    res.json(updated);
  }
);

router.post(
  "/feeds/:id/share",
  authenticate,
  async (req, res): Promise<void> => {

    const id = parseInt(
  Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id,
  10
);

    const [feed] = await db
      .select()
      .from(feedsTable)
      .where(eq(feedsTable.id, id));

    if (!feed) {
      res.status(404).json({
        error: "Feed not found",
      });

      return;
    }

    const [updated] = await db
      .update(feedsTable)
      .set({
        shares: feed.shares + 1,
      })
      .where(eq(feedsTable.id, id))
      .returning();

    res.json(updated);
  }
);

export default router;
