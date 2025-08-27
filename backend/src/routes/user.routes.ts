import { Router } from "express";
import * as userController from "../controllers/user.controller.js";

const router = Router();

// Authentication routes
router.post("/signup", userController.signup);
router.post("/signin", userController.signin);
router.post("/signout", userController.signout);

export default router;
