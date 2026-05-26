import { Router, type IRouter } from "express";
import { db, usersTable, examsTable, questionsTable, attemptsTable, resultsTable, quizzesTable, topicMocksTable, papersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { authenticate, requireAdmin, type AuthRequest } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/dashboard/admin", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const [{ count: totalStudents }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "STUDENT"));
  const [{ count: totalExams }] = await db.select({ count: sql<number>`count(*)` }).from(examsTable);
  const [{ count: totalQuestions }] = await db.select({ count: sql<number>`count(*)` }).from(questionsTable);
  const [{ count: totalAttempts }] = await db.select({ count: sql<number>`count(*)` }).from(attemptsTable);
  const [{ count: activeExams }] = await db.select({ count: sql<number>`count(*)` }).from(examsTable).where(eq(examsTable.active, true));
  const [{ count: totalQuizzes }] = await db.select({ count: sql<number>`count(*)` }).from(quizzesTable);
  const [{ count: totalTopicMocks }] = await db.select({ count: sql<number>`count(*)` }).from(topicMocksTable);
  const [{ count: totalPapers }] = await db.select({ count: sql<number>`count(*)` }).from(papersTable);

  const recentAttemptRows = await db.select().from(attemptsTable).orderBy(desc(attemptsTable.createdAt)).limit(5);
  const recentAttempts = recentAttemptRows.map(a => {
    const { answers: _a, ...rest } = a;
    return { ...rest, examTitle: null };
  });

  const examTypeBreakdown = await db.select({ examType: examsTable.examType, count: sql<number>`count(*)` })
    .from(examsTable)
    .groupBy(examsTable.examType);

  res.json({
    totalStudents: Number(totalStudents),
    totalExams: Number(totalExams),
    totalQuestions: Number(totalQuestions),
    totalAttempts: Number(totalAttempts),
    activeExams: Number(activeExams),
    totalQuizzes: Number(totalQuizzes),
    totalTopicMocks: Number(totalTopicMocks),
    totalPapers: Number(totalPapers),
    recentAttempts,
    examTypeBreakdown: examTypeBreakdown.map(e => ({ examType: e.examType, count: Number(e.count) })),
  });
});

router.get("/dashboard/student", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [{ count: totalAttempts }] = await db.select({ count: sql<number>`count(*)` }).from(attemptsTable).where(eq(attemptsTable.userId, req.userId!));
  const [{ count: completedExams }] = await db.select({ count: sql<number>`count(*)` }).from(attemptsTable)
    .where(eq(attemptsTable.userId, req.userId!));

  const myResults = await db.select().from(resultsTable).where(eq(resultsTable.userId, req.userId!));
  const avgScore = myResults.length > 0
    ? myResults.reduce((sum, r) => sum + r.accuracy, 0) / myResults.length
    : 0;

  const activeExams = await db.select().from(examsTable).where(eq(examsTable.active, true)).limit(6);
  const recentResults = (await db.select().from(resultsTable).where(eq(resultsTable.userId, req.userId!)).orderBy(desc(resultsTable.createdAt)).limit(5))
    .map(r => ({ ...r, examTitle: null, entityType: null, rank: null, percentile: null }));

  const availableQuizzes = (await db.select().from(quizzesTable).where(eq(quizzesTable.published, true)).limit(5))
    .map(q => ({ ...q, questionCount: null }));

  res.json({
    totalAttempts: Number(totalAttempts),
    completedExams: Number(completedExams),
    averageScore: Math.round(avgScore * 10) / 10,
    weeklyStreak: 0,
    weakTopics: [],
    activeExams: activeExams.map(e => ({ ...e, questionCount: null, attemptCount: null })),
    recentResults,
    availableQuizzes,
  });
});

router.get("/dashboard/analytics", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const attemptsByDate = await db.select({
    date: sql<string>`to_char(${attemptsTable.createdAt}, 'YYYY-MM-DD')`,
    count: sql<number>`count(*)`,
  }).from(attemptsTable).groupBy(sql`to_char(${attemptsTable.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`to_char(${attemptsTable.createdAt}, 'YYYY-MM-DD')`).limit(30);

  const allResults = await db.select({ accuracy: resultsTable.accuracy }).from(resultsTable);
  const scoreDistribution = [
    { range: "0-20%", count: allResults.filter(r => r.accuracy < 20).length },
    { range: "20-40%", count: allResults.filter(r => r.accuracy >= 20 && r.accuracy < 40).length },
    { range: "40-60%", count: allResults.filter(r => r.accuracy >= 40 && r.accuracy < 60).length },
    { range: "60-80%", count: allResults.filter(r => r.accuracy >= 60 && r.accuracy < 80).length },
    { range: "80-100%", count: allResults.filter(r => r.accuracy >= 80).length },
  ];

  res.json({
    attemptsByDate: attemptsByDate.map(a => ({ date: a.date, count: Number(a.count) })),
    scoreDistribution,
    topPerformers: [],
  });
});

router.get("/dashboard/recent-activity", authenticate, requireAdmin, async (_req, res): Promise<void> => {
  const recentAttempts = await db.select().from(attemptsTable).orderBy(desc(attemptsTable.createdAt)).limit(10);
  const activities = await Promise.all(
    recentAttempts.map(async (attempt, i) => {
      const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, attempt.userId));
      return {
        id: attempt.id,
        type: "ATTEMPT",
        description: `${user?.name ?? "Unknown"} started an attempt`,
        userName: user?.name ?? null,
        createdAt: attempt.createdAt,
      };
    })
  );
  res.json(activities);
});

export default router;
