import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, requireAdmin } from "../middlewares/authenticate";

const router: IRouter = Router();

router.get("/questions", authenticate, async (req, res): Promise<void> => {
  const { examId, sectionId, subjectId, topicId, difficulty, search } = req.query as Record<string, string>;

  let questions = await db.select().from(questionsTable);

  if (examId) questions = questions.filter(q => q.examId === parseInt(examId, 10));
  if (sectionId) questions = questions.filter(q => q.sectionId === parseInt(sectionId, 10));
  if (subjectId) questions = questions.filter(q => q.subjectId === parseInt(subjectId, 10));
  if (topicId) questions = questions.filter(q => q.topicId === parseInt(topicId, 10));
  if (difficulty) questions = questions.filter(q => q.difficulty === difficulty);
  if (search) questions = questions.filter(q => q.questionText.toLowerCase().includes(search.toLowerCase()));

  res.json(questions);
});

function parseQuestionBlock(block: string): {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  marks: number;
  negativeMarks: number;
  difficulty?: string;
} | null {
  const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  const getField = (prefixes: string[]): string => {
    for (const line of lines) {
      for (const prefix of prefixes) {
        if (line.toLowerCase().startsWith(prefix.toLowerCase())) {
          return line.slice(prefix.length).trim();
        }
      }
    }
    return "";
  };

  const getOption = (letter: string): string => {
    const prefixes = [
      `${letter}.`, `${letter})`, `${letter}:`,
      `option ${letter}:`, `option${letter}:`,
    ];
    return getField(prefixes);
  };

  const questionText = getField(["Question:", "Q:", "Q."]);
  const optionA = getOption("A");
  const optionB = getOption("B");
  const optionC = getOption("C");
  const optionD = getOption("D");
  const correctAnswer = getField(["Answer:", "Correct Answer:", "Correct:", "Ans:"]).replace(/^[()]/g, "").trim().toUpperCase().charAt(0) || "A";
  const explanation = getField(["Explanation:", "Exp:", "Solution:"]);
  const difficultyRaw = getField(["Difficulty:", "Level:"]);
  const marksRaw = getField(["Marks:", "Mark:"]);
  const negativeMarksRaw = getField(["NegativeMarks:", "Negative Marks:", "Negative:"]);

  if (!questionText || !optionA || !optionB || !optionC || !optionD) {
    return null;
  }

  if (!["A", "B", "C", "D"].includes(correctAnswer)) {
    return null;
  }

  return {
    questionText,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer,
    explanation,
    marks: marksRaw ? Number(marksRaw) || 1 : 1,
    negativeMarks: negativeMarksRaw ? Number(negativeMarksRaw) || 0 : 0,
    difficulty: difficultyRaw || undefined,
  };
}

router.post("/questions/import", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { text, examId, quizId, topicMockId, sectionId, subjectId, topicId } = req.body;

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "TXT content is required" });
    return;
  }

  try {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const blocks = normalized.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length > 0);

    const parsedQuestions: {
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      correctAnswer: string;
      explanation: string;
      marks: number;
      negativeMarks: number;
      difficulty?: string;
      examId?: number;
      quizId?: number;
      topicMockId?: number;
      sectionId?: number;
      subjectId?: number;
      topicId?: number;
    }[] = [];

    for (const block of blocks) {
      const parsed = parseQuestionBlock(block);
      if (!parsed) continue;

      parsedQuestions.push({
        ...parsed,
        examId: examId ? Number(examId) : undefined,
        quizId: quizId ? Number(quizId) : undefined,
        topicMockId: topicMockId ? Number(topicMockId) : undefined,
        sectionId: sectionId ? Number(sectionId) : undefined,
        subjectId: subjectId ? Number(subjectId) : undefined,
        topicId: topicId ? Number(topicId) : undefined,
      });
    }

    if (parsedQuestions.length === 0) {
      res.status(400).json({
        error: "No valid questions found in the file. Make sure the format includes Question:, A., B., C., D., and Answer: fields.",
      });
      return;
    }

    await db.insert(questionsTable).values(parsedQuestions);

    res.status(201).json({ success: true, count: parsedQuestions.length });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ error: "Failed to import questions" });
  }
});

router.post("/questions", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const { questionText, optionA, optionB, optionC, optionD, correctAnswer, marks, ...rest } = req.body;
  if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctAnswer || !marks) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  const [question] = await db.insert(questionsTable).values({
    questionText, optionA, optionB, optionC, optionD, correctAnswer, marks, ...rest,
  }).returning();
  res.status(201).json(question);
});

router.get("/questions/:id", authenticate, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [question] = await db.select().from(questionsTable).where(eq(questionsTable.id, id));
  if (!question) { res.status(404).json({ error: "Question not found" }); return; }
  res.json(question);
});

router.patch("/questions/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const updates = req.body;
  const [question] = await db.update(questionsTable).set(updates).where(eq(questionsTable.id, id)).returning();
  if (!question) { res.status(404).json({ error: "Question not found" }); return; }
  res.json(question);
});

router.delete("/questions/:id", authenticate, requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [question] = await db.delete(questionsTable).where(eq(questionsTable.id, id)).returning();
  if (!question) { res.status(404).json({ error: "Question not found" }); return; }
  res.sendStatus(204);
});

export default router;
