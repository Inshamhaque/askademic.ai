import { Request, Response } from "express";
import * as researchService from "../services/researchService.js";

export const initiateResearch = async (req: Request, res: Response) => {
  try {
    const { query, depth, sources } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    if (!depth || !["quick", "deep", "comprehensive"].includes(depth)) {
      return res.status(400).json({ error: "Depth must be 'quick', 'deep', or 'comprehensive'" });
    }

    // Sources are optional - the agent will find them automatically
    const result = await researchService.initiateResearch(query, depth, sources || []);
    res.json(result);
  } catch (error: any) {
    console.error("Error initiating research:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getSources = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const result = await researchService.getSources(sessionId);
    res.json(result);
  } catch (error: any) {
    console.error("Error getting sources:", error);
    res.status(500).json({ error: error.message });
  }
};

export const analyzeResearch = async (req: Request, res: Response) => {
  try {
    const { sessionId, analysisLevel } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    
    if (!analysisLevel || !["quick", "deep", "comprehensive"].includes(analysisLevel)) {
      return res.status(400).json({ error: "Analysis level must be 'quick', 'deep', or 'comprehensive'" });
    }

    const result = await researchService.analyzeResearch(sessionId, analysisLevel);
    res.json(result);
  } catch (error: any) {
    console.error("Error analyzing research:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getReport = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const result = await researchService.getReport(sessionId);
    res.json(result);
  } catch (error: any) {
    console.error("Error getting report:", error);
    res.status(500).json({ error: error.message });
  }
};

export const addFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId, feedback } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    
    if (!feedback) {
      return res.status(400).json({ error: "Feedback is required" });
    }

    const result = await researchService.addFeedback(sessionId, feedback);
    res.json(result);
  } catch (error: any) {
    console.error("Error adding feedback:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getResearchStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const result = await researchService.getResearchStatus(sessionId);
    res.json(result);
  } catch (error: any) {
    console.error("Error getting research status:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getAgentLogs = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const result = await researchService.getAgentLogs(sessionId);
    res.json(result);
  } catch (error: any) {
    console.error("Error getting agent logs:", error);
    res.status(500).json({ error: error.message });
  }
};
