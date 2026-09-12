import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studyLoopRouter from "./studyloop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studyLoopRouter);

export default router;
