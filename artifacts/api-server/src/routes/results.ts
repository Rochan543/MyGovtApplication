import { Router, type IRouter } from "express";
import { db, resultsTable, attemptsTable, questionsTable, examsTable, quizzesTable, topicMocksTable, sectionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/results", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const results = await db.select().from(resultsTable)
    .where(eq(resultsTable.userId, req.userId!))
    .orderBy(desc(resultsTable.createdAt));

  const withTitles = await Promise.all(
    results.map(async (result) => {
      const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, result.attemptId));
      let examTitle: string | null = null;
      if (attempt) {
        if (attempt.entityType === "EXAM") {
          const [exam] = await db.select({ title: examsTable.title }).from(examsTable).where(eq(examsTable.id, attempt.entityId));
          examTitle = exam?.title ?? null;
        } else if (attempt.entityType === "QUIZ") {
          const [quiz] = await db.select({ title: quizzesTable.title }).from(quizzesTable).where(eq(quizzesTable.id, attempt.entityId));
          examTitle = quiz?.title ?? null;
        } else if (attempt.entityType === "TOPIC_MOCK") {
          const [mock] = await db.select({ title: topicMocksTable.title }).from(topicMocksTable).where(eq(topicMocksTable.id, attempt.entityId));
          examTitle = mock?.title ?? null;
        }
      }
      return { ...result, examTitle, entityType: attempt?.entityType ?? null, rank: null, percentile: null };
    })
  );

  res.json(withTitles);
});

router.get("/results/:attemptId", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const attemptId = parseInt(Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId, 10);

  const [result] = await db.select().from(resultsTable).where(eq(resultsTable.attemptId, attemptId));
  if (!result) { res.status(404).json({ error: "Result not found" }); return; }

  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, attemptId));
  if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }

  let examTitle: string | null = null;
  let questions: { id: number; questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; marks: number; explanation: string | null; sectionId: number | null }[] = [];

  if (attempt.entityType === "EXAM") {
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, attempt.entityId));
    examTitle = exam?.title ?? null;
    questions = await db.select({
      id: questionsTable.id,
      questionText: questionsTable.questionText,
      optionA: questionsTable.optionA,
      optionB: questionsTable.optionB,
      optionC: questionsTable.optionC,
      optionD: questionsTable.optionD,
      correctAnswer: questionsTable.correctAnswer,
      marks: questionsTable.marks,
      explanation: questionsTable.explanation,
      sectionId: questionsTable.sectionId,
    }).from(questionsTable).where(eq(questionsTable.examId, attempt.entityId));
  } else if (attempt.entityType === "QUIZ") {
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, attempt.entityId));
    examTitle = quiz?.title ?? null;
    questions = await db.select({
      id: questionsTable.id,
      questionText: questionsTable.questionText,
      optionA: questionsTable.optionA,
      optionB: questionsTable.optionB,
      optionC: questionsTable.optionC,
      optionD: questionsTable.optionD,
      correctAnswer: questionsTable.correctAnswer,
      marks: questionsTable.marks,
      explanation: questionsTable.explanation,
      sectionId: questionsTable.sectionId,
    }).from(questionsTable).where(eq(questionsTable.quizId, attempt.entityId));
  } else if (attempt.entityType === "TOPIC_MOCK") {
    const [mock] = await db.select().from(topicMocksTable).where(eq(topicMocksTable.id, attempt.entityId));
    examTitle = mock?.title ?? null;
    if (mock) {
      questions = await db.select({
        id: questionsTable.id,
        questionText: questionsTable.questionText,
        optionA: questionsTable.optionA,
        optionB: questionsTable.optionB,
        optionC: questionsTable.optionC,
        optionD: questionsTable.optionD,
        correctAnswer: questionsTable.correctAnswer,
        marks: questionsTable.marks,
        explanation: questionsTable.explanation,
        sectionId: questionsTable.sectionId,
      }).from(questionsTable).where(eq(questionsTable.topicMockId, attempt.entityId));
    }
  }

  const answers = (attempt.answers as Array<{ questionId: number; selectedOption?: string | null; markedForReview?: boolean }>) ?? [];

  const answerResults = questions.map(q => {
    const answer = answers.find(a => a.questionId === q.id);
    return {
      questionId: q.id,
      questionText: q.questionText,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      selectedOption: answer?.selectedOption ?? null,
      correctAnswer: q.correctAnswer,
      isCorrect:
        answer?.selectedOption?.trim().toUpperCase() ===
        q.correctAnswer?.trim().toUpperCase(),
      markedForReview: answer?.markedForReview ?? false,
      marks: q.marks,
      explanation: q.explanation,
    };
  });

  // Section analysis
  const sections = attempt.entityType === "EXAM"
    ? await db.select().from(sectionsTable).where(eq(sectionsTable.examId, attempt.entityId))
    : [];

  const sectionAnalysis = sections.map(section => {
    const sectionQuestions = questions.filter(q => q.sectionId === section.id);
    let correct = 0, wrong = 0, skipped = 0, score = 0;
    for (const q of sectionQuestions) {
      const answer = answers.find(a => a.questionId === q.id);
      if (!answer || !answer.selectedOption) { skipped++; }
     else if (
        answer.selectedOption?.trim().toUpperCase() ===
        q.correctAnswer?.trim().toUpperCase()
      ) {
        correct++;
        score += q.marks;
      }
      else { wrong++; }
    }
    return { sectionId: section.id, sectionName: section.name, correct, wrong, skipped, score, timeTaken: null };
  });

  res.json({
    ...result,
    examTitle,
    entityType: attempt.entityType,
    rank: null,
    percentile: null,
    sectionAnalysis,
    answers: answerResults,
  });
});

router.get("/results/:attemptId/leaderboard", authenticate, async (req, res): Promise<void> => {
  const attemptId = parseInt(Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId, 10);
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, attemptId));
  if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }

  // Find all attempts for same entity, get results
  const allAttempts = await db.select().from(attemptsTable)
    .where(eq(attemptsTable.entityId, attempt.entityId));

  const allResults = await Promise.all(
    allAttempts.map(async (a) => {
      const [result] = await db.select().from(resultsTable).where(eq(resultsTable.attemptId, a.id));
      const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, a.userId));
      return result ? { ...result, userId: a.userId, userName: user?.name ?? "Unknown" } : null;
    })
  );

  const valid = allResults.filter(Boolean).sort((a, b) => (b!.totalScore - a!.totalScore));
  const leaderboard = valid.map((r, i) => ({
    rank: i + 1,
    userId: r!.userId,
    userName: r!.userName,
    totalScore: r!.totalScore,
    accuracy: r!.accuracy,
    timeTaken: r!.timeTaken ?? 0,
  }));

  res.json(leaderboard);
});

export default router;
