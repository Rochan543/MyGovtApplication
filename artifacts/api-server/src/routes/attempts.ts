import { Router, type IRouter } from "express";
import { db, attemptsTable, examsTable, sectionsTable, questionsTable, quizzesTable, topicMocksTable, resultsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/attempts", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const { examId, status } = req.query as { examId?: string; status?: string };
  let attempts = await db.select().from(attemptsTable).where(eq(attemptsTable.userId, req.userId!));

  if (examId) attempts = attempts.filter(a => a.entityId === parseInt(examId, 10));
  if (status) attempts = attempts.filter(a => a.status === status);

  const withTitles = await Promise.all(
    attempts.map(async (attempt) => {
      let examTitle: string | null = null;
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
      const { answers: _answers, ...rest } = attempt;
      return { ...rest, examTitle };
    })
  );

  res.json(withTitles);
});

router.post("/attempts", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const { entityType, entityId } = req.body;
  if (!entityType || !entityId) {
    res.status(400).json({ error: "entityType and entityId are required" });
    return;
  }

  // Get entity details for timeRemaining
let duration = 60;

if (entityType === "EXAM") {
  const [exam] = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.id, entityId));

  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }

  duration = exam.duration;

} else if (entityType === "QUIZ") {

  const [quiz] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.id, entityId));

  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }

  duration = quiz.duration;

} else if (entityType === "TOPIC_MOCK") {

  const [mock] = await db
    .select()
    .from(topicMocksTable)
    .where(eq(topicMocksTable.id, entityId));

  if (!mock) {
    res.status(404).json({ error: "Topic mock not found" });
    return;
  }

  duration = mock.duration;
}

  const [attempt] = await db.insert(attemptsTable).values({
    userId: req.userId!,
    entityType,
    entityId,
    status: "IN_PROGRESS",
    currentSection: 0,
    timeRemaining: duration * 60,
    answers: [],
  }).returning();

  // Get the questions and sections for the attempt
  let questions: Record<string, unknown>[] = [];
  let sections: Record<string, unknown>[] = [];
  let examTitle: string | null = null;
  let hasSectionalTimer = false;

  if (entityType === "EXAM") {
    const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, entityId));
    if (exam) {
      examTitle = exam.title;
      hasSectionalTimer = exam.hasSectionalTimer;
      questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, entityId));
      sections = await db.select().from(sectionsTable).where(eq(sectionsTable.examId, entityId));
    }
  } else if (entityType === "QUIZ") {
    const [quiz] = await db.select().from(quizzesTable).where(eq(quizzesTable.id, entityId));
    if (quiz) examTitle = quiz.title;
    questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, entityId));
} else if (entityType === "TOPIC_MOCK") {

  const [mock] = await db
    .select()
    .from(topicMocksTable)
    .where(eq(topicMocksTable.id, entityId));

  if (mock) {

    examTitle = mock.title;

    questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.topicMockId, entityId));
  }
}

  res.status(201).json({
    ...attempt,
    answers: [],
    questions,
    sections,
    examTitle,
    duration,
    hasSectionalTimer,
  });
});

router.get("/attempts/:id", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [attempt] = await db.select().from(attemptsTable)
    .where(and(eq(attemptsTable.id, id), eq(attemptsTable.userId, req.userId!)));
  if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
//   const [latestAttempt] = await db
//   .select()
//   .from(attemptsTable)
//   .where(eq(attemptsTable.id, id));

// const answers =
//   ((latestAttempt?.answers ?? []) as Array<{
//     questionId: number;
//     selectedOption?: string | null;
//     markedForReview?: boolean;
//     timeSpent?: number;
//   }>);

  let questions: Record<string, unknown>[] = [];
  let sections: Record<string, unknown>[] = [];
  let examTitle: string | null = null;
  let duration = 60;
  let hasSectionalTimer = false;

if (attempt.entityType === "EXAM") {

  const [exam] = await db
    .select()
    .from(examsTable)
    .where(eq(examsTable.id, attempt.entityId));

  if (exam) {
    examTitle = exam.title;
    duration = exam.duration;
    hasSectionalTimer = exam.hasSectionalTimer;
  }

  questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, attempt.entityId));

  sections = await db
    .select()
    .from(sectionsTable)
    .where(eq(sectionsTable.examId, attempt.entityId));

} else if (attempt.entityType === "QUIZ") {

  const [quiz] = await db
    .select()
    .from(quizzesTable)
    .where(eq(quizzesTable.id, attempt.entityId));

  if (quiz) {
    examTitle = quiz.title;
    duration = quiz.duration;
  }

  questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.quizId, attempt.entityId));

} else if (attempt.entityType === "TOPIC_MOCK") {

  const [mock] = await db
    .select()
    .from(topicMocksTable)
    .where(eq(topicMocksTable.id, attempt.entityId));

  if (mock) {
    examTitle = mock.title;
    duration = mock.duration;
  }

  if (attempt.entityId) {

    const [mock2] = await db
      .select()
      .from(topicMocksTable)
      .where(eq(topicMocksTable.id, attempt.entityId));

    if (mock2) {
      questions = await db
        .select()
        .from(questionsTable)
        // .where(eq(questionsTable.topicId, mock2.topicId));
        .where(eq(questionsTable.topicMockId, attempt.entityId));
    }
  }
}
  res.json({
    ...attempt,
    answers: attempt.answers ?? [],
    questions,
    sections,
    examTitle,
    duration,
    hasSectionalTimer,
  });
});

router.patch("/attempts/:id", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { answers, currentSection, timeRemaining } = req.body;

  const [attempt] = await db.update(attemptsTable).set({
    ...(answers !== undefined && { answers }),
    ...(currentSection !== undefined && { currentSection }),
    ...(timeRemaining !== undefined && { timeRemaining }),
  }).where(and(eq(attemptsTable.id, id), eq(attemptsTable.userId, req.userId!))).returning();

  if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }

  const { answers: _a, ...rest } = attempt;
  res.json({ ...rest, examTitle: null });
});

router.post("/attempts/:id/submit", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [attempt] = await db.select().from(attemptsTable)
    .where(and(eq(attemptsTable.id, id), eq(attemptsTable.userId, req.userId!)));
  if (!attempt) { res.status(404).json({ error: "Attempt not found" }); return; }
  const [latestAttempt] = await db
  .select()
  .from(attemptsTable)
  .where(eq(attemptsTable.id, id));

const answers =
  ((latestAttempt?.answers ?? []) as Array<{
    questionId: number;
    selectedOption?: string | null;
    markedForReview?: boolean;
    timeSpent?: number;
  }>);

  // Get questions to score
let questions: {
  id: number;
  correctAnswer: string;
  marks: number;
  negativeMarks: number;
  sectionId: number | null;
}[] = [];

if (attempt.entityType === "EXAM") {

  questions = await db.select({
    id: questionsTable.id,
    correctAnswer: questionsTable.correctAnswer,
    marks: questionsTable.marks,
    negativeMarks: questionsTable.negativeMarks,
    sectionId: questionsTable.sectionId,
  })
  .from(questionsTable)
  .where(eq(questionsTable.examId, attempt.entityId));

} else if (attempt.entityType === "TOPIC_MOCK") {

  const [mock] = await db
    .select()
    .from(topicMocksTable)
    .where(eq(topicMocksTable.id, attempt.entityId));

  if (mock) {

    questions = await db.select({
      id: questionsTable.id,
      correctAnswer: questionsTable.correctAnswer,
      marks: questionsTable.marks,
      negativeMarks: questionsTable.negativeMarks,
      sectionId: questionsTable.sectionId,
    })
    .from(questionsTable)
    // .where(eq(questionsTable.topicId, mock.topicId));
    .where(eq(questionsTable.topicMockId, attempt.entityId));
  }

} else if (attempt.entityType === "QUIZ") {

  questions = await db.select({
    id: questionsTable.id,
    correctAnswer: questionsTable.correctAnswer,
    marks: questionsTable.marks,
    negativeMarks: questionsTable.negativeMarks,
    sectionId: questionsTable.sectionId,
  })
  .from(questionsTable)
  .where(eq(questionsTable.quizId, attempt.entityId));

}

  // const answers =
  // ((req.body.answers ?? attempt.answers ?? []) as Array<{
  //   questionId: number;
  //   selectedOption?: string | null;
  //   markedForReview?: boolean;
  //   timeSpent?: number;
  // }>);
  // const answers =
  // ((attempt.answers ?? []) as Array<{
  //   questionId: number;
  //   selectedOption?: string | null;
  //   markedForReview?: boolean;
  //   timeSpent?: number;
  // }>);
  let totalScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  const maxScore = questions.reduce((sum, q) => sum + q.marks, 0);

for (const question of questions) {
  const answer = answers.find(
    (a) => a.questionId === question.id
  );

  console.log({
    selected: answer?.selectedOption,
    correct: question.correctAnswer,
  });

  if (!answer || !answer.selectedOption) {
    skippedCount++;
  } else if (
    answer.selectedOption?.trim().toUpperCase() ===
    question.correctAnswer?.trim().toUpperCase()
  ) {
    totalScore += question.marks;
    correctCount++;
  } else {
    totalScore -= question.negativeMarks;
    wrongCount++;
  }
}

  const accuracy = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;

  const [updatedAttempt] = await db.update(attemptsTable).set({
    status: "SUBMITTED",
    submittedAt: new Date(),
  }).where(eq(attemptsTable.id, id)).returning();

  const [result] = await db.insert(resultsTable).values({
    attemptId: id,
    userId: req.userId!,
    totalScore: Math.max(0, totalScore),
    maxScore,
    correctCount,
    wrongCount,
    skippedCount,
    accuracy,
    timeTaken: attempt.timeRemaining ? undefined : undefined,
  }).returning();

  let examTitle: string | null = null;
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

  res.json({
    ...result,
    examTitle,
    entityType: attempt.entityType,
    rank: null,
    percentile: null,
  });
});

export default router;
