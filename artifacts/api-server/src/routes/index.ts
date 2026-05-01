import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ttsRouter from "./tts";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ttsRouter);
router.use(authRouter);

export default router;
