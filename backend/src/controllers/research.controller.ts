import { Request, Response } from "express";
import * as researchService from "../services/researchService.js";

export const initiateResearch = async (req: Request, res: Response) => {
  try {
    const { query, depth } = req.body;
    const userId = req.userId; // From auth middleware

    if (!query || !depth) {
      return res.status(400).json({ error: "Query and depth are required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await researchService.initiateResearch(query, depth, userId);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error initiating research:", error);
    res.status(500).json({ error: error.message });
  }
};

export const listUserSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "User not authenticated" });
    const sessions = await researchService.listUserSessions(userId);
    res.json({ sessions });
  } catch (error: any) {
    console.error("Error listing sessions:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getResearchStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const status = await researchService.getResearchStatus(sessionId??"", userId);
    res.json(status);
  } catch (error: any) {
    console.error("Error getting research status:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAgentLogs = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const logs = await researchService.getAgentLogs(sessionId??"", userId);
    res.json(logs);
  } catch (error: any) {
    console.error("Error getting agent logs:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getSources = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const sources = await researchService.getSources(sessionId??"", userId);
    res.json(sources);
  } catch (error: any) {
    console.error("Error getting sources:", error);
    res.status(500).json({ error: error.message });
  }
};

export const uploadUserDocument = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;
    const { filename, contentBase64 } = req.body as { filename: string; contentBase64: string };

    if (!userId) return res.status(401).json({ error: "User not authenticated" });
    if (!sessionId || !filename || !contentBase64) return res.status(400).json({ error: 'sessionId, filename and contentBase64 are required' });

    const result = await researchService.storeUserDocument(sessionId, userId, filename, contentBase64);
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error uploading user document:', error);
    res.status(500).json({ error: error.message });
  }
};

export const analyzeResearch = async (req: Request, res: Response) => {
  try {
    const { sessionId, analysisType } = req.body;
    const userId = req.userId;

    if (!sessionId || !analysisType) {
      return res.status(400).json({ error: "Session ID and analysis type are required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await researchService.analyzeResearch(sessionId, analysisType, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Error analyzing research:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getReport = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const report = await researchService.getReport(sessionId??"", userId);
    res.json(report);
  } catch (error: any) {
    console.error("Error getting report:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId, feedback, refinementRequest } = req.body;
    const userId = req.userId;

    if (!sessionId || !feedback) {
      return res.status(400).json({ error: "Session ID and feedback are required" });
    }

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const result = await researchService.addFeedback(sessionId, feedback, refinementRequest, userId);
    res.json(result);
  } catch (error: any) {
    console.error("Error adding feedback:", error);
    res.status(500).json({ error: error.message });
  }
};
