import { Router, type IRouter } from "express";
import healthRouter from "./health";
import churchillRouter from "./churchill";
import authRouter from "./auth";
import ieltsRouter from "./ielts";
import conversationRouter from "./conversation";
import listeningRouter, { storageRouter, listeningAdminRouter } from "./listening";
import readingRouter, { readingAdminRouter } from "./reading";
import { requireActiveStudent } from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/churchill/auth", authRouter);
router.use("/churchill/listening", listeningAdminRouter);
router.use("/churchill/reading", readingAdminRouter);
router.use("/churchill", requireActiveStudent, churchillRouter);
router.use("/churchill/ielts", requireActiveStudent, ieltsRouter);
router.use("/churchill/conversation", requireActiveStudent, conversationRouter);
router.use("/churchill/listening", requireActiveStudent, listeningRouter);
router.use("/churchill/reading", requireActiveStudent, readingRouter);

export default router;
