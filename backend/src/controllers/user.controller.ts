import { Request, Response } from "express";
import * as userService from "../services/userService.js";

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const result = await userService.signup(name, email, password);
    res.json(result);
  } catch (error: any) {
    console.error("Error in signup:", error);
    res.status(500).json({ error: error.message });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await userService.signin(email, password);
    res.json(result);
  } catch (error: any) {
    console.error("Error in signin:", error);
    res.status(500).json({ error: error.message });
  }
};

export const signout = async (req: Request, res: Response) => {
  try {
    const result = await userService.signout(req.body.sessionToken);
    res.json(result);
  } catch (error: any) {
    console.error("Error in signout:", error);
    res.status(500).json({ error: error.message });
  }
};
