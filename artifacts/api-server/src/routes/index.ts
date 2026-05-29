import { Router, type IRouter } from "express";
import healthRouter from "./health";
import novaConfigRouter from "./nova-config";
import scratchpadRouter from "./scratchpad";
import bitdeerProxyRouter from "./bitdeer-proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(novaConfigRouter);
router.use(scratchpadRouter);
router.use(bitdeerProxyRouter);

export default router;
