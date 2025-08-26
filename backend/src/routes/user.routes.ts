import { Router } from "express";

const router = Router();

// Basic user endpoints (placeholder for now)
router.get("/profile", (req, res) => {
  res.json({ message: "User profile endpoint - implement authentication" });
});

export default router;
