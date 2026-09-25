import { Router } from "express";
import { accountController } from "../controllers/account.controller";
import { requireAuth } from "../middleware/requireAuth";
import { asyncHandler } from "../utils/asyncHandler";

export const accountRouter = Router();
accountRouter.use(requireAuth);
accountRouter.delete("/", asyncHandler(accountController.deleteAccount));
