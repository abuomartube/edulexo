import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ttsRouter from "./tts";
import authRouter from "./auth";
import enrollmentsRouter from "./enrollments";
import adminRouter from "./admin";
import ssoRouter from "./sso";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ttsRouter);
router.use(authRouter);
router.use(enrollmentsRouter);
router.use(adminRouter);
router.use(ssoRouter);

export default router;
