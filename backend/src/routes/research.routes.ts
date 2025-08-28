import { Router } from "express";
import * as researchController from "../controllers/research.controller.js";
import { authenticateUser } from "../middleware/auth.js";

const router = Router();

// Apply authentication middleware to all research routes
router.use(authenticateUser);

// Sessions
router.get("/sessions", researchController.listUserSessions);

// Research workflow endpoints
router.post("/initiate", researchController.initiateResearch);
router.get("/status/:sessionId", researchController.getResearchStatus);
router.get("/logs/:sessionId", researchController.getAgentLogs);

// Research data endpoints
router.get("/sources/:sessionId", researchController.getSources);
router.post("/upload/:sessionId", researchController.uploadUserDocument);
router.post("/analyze", researchController.analyzeResearch);
router.get("/report/:sessionId", researchController.getReport);

// Feedback and refinement
router.post("/feedback", researchController.addFeedback);

export default router;
