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
router.use("/auth", authRouter);
router.use("/listening", listeningAdminRouter);
router.use("/reading", readingAdminRouter);
router.use(requireActiveStudent, churchillRouter);
router.use("/ielts", requireActiveStudent, ieltsRouter);
router.use("/conversation", requireActiveStudent, conversationRouter);
router.use("/listening", requireActiveStudent, listeningRouter);
router.use("/reading", requireActiveStudent, readingRouter);

export default router;
