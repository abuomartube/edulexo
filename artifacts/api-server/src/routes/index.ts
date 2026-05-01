import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ttsRouter from "./tts";
import authRouter from "./auth";
import enrollmentsRouter from "./enrollments";
import adminRouter from "./admin";
import adminStatsRouter from "./admin-stats";
import adminEmailRouter from "./admin-email";
import ssoRouter from "./sso";
import englishRouter from "./english";
import faqsRouter from "./faqs";
import coursesRouter from "./courses";
import certificatesRouter from "./certificates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ttsRouter);
router.use(authRouter);
router.use(enrollmentsRouter);
router.use(adminRouter);
router.use(adminStatsRouter);
router.use(adminEmailRouter);
router.use(ssoRouter);
router.use(englishRouter);
router.use(faqsRouter);
router.use(coursesRouter);
router.use(certificatesRouter);

export default router;
