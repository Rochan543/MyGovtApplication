import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import examsRouter from "./exams";
import sectionsRouter from "./sections";
import subjectsRouter from "./subjects";
import questionsRouter from "./questions";
import topicMocksRouter from "./topic_mocks";
import quizzesRouter from "./quizzes";
import attemptsRouter from "./attempts";
import resultsRouter from "./results";
import papersRouter from "./papers";
import violationsRouter from "./violations";
import dashboardRouter from "./dashboard";
import feedsRouter from "./feeds";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(examsRouter);
router.use(sectionsRouter);
router.use(subjectsRouter);
router.use(questionsRouter);
router.use(topicMocksRouter);
router.use(quizzesRouter);
router.use(attemptsRouter);
router.use(resultsRouter);
router.use(papersRouter);
router.use(violationsRouter);
router.use(dashboardRouter);
router.use(feedsRouter);
router.use(uploadRouter);

export default router;
