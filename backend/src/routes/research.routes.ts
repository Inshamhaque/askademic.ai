import { Router } from "express";
import * as researchController from "../controllers/research.controller.js";

const router = Router();

// Research workflow endpoints
router.post("/initiate", researchController.initiateResearch);
router.get("/status/:sessionId", researchController.getResearchStatus);

// Research data endpoints
router.get("/sources/:sessionId", researchController.getSources);
router.post("/analyze", researchController.analyzeResearch);
router.get("/report/:sessionId", researchController.getReport);

// Feedback and refinement
router.post("/feedback", researchController.addFeedback);

export default router;
