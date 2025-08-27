import { PrismaClient } from "../../dist/generated/prisma/index.js";
import researchAgent from "../agents/researchAgent.js";
import crypto from "crypto";

const prisma = new PrismaClient();

export const initiateResearch = async (query: string, depth: string, userId: string) => {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create session for this research with token + expiry
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const session = await prisma.session.create({
      data: {
        userId: userId,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    // Execute research with the agent
    const agentRunId = await researchAgent.executeResearch(session.id, {
      query,
      depth: depth as 'quick' | 'deep' | 'comprehensive'
    });

    return {
      sessionId: session.id,
      agentRunId: agentRunId,
      status: "initiated",
      message: 'Research initiated successfully'
    };
  } catch (error: any) {
    console.error("Error in initiateResearch:", error);
    throw new Error(`Failed to initiate research: ${error.message}`);
  }
};

export const getResearchStatus = async (sessionId: string, userId: string) => {
  try {
    const agentRun = await prisma.agentRun.findFirst({
      where: {
        sessionId: sessionId,
        session: {
          userId: userId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!agentRun) {
      throw new Error("Research session not found");
    }

    return {
      status: agentRun.status,
      message: `Research ${agentRun.status}`
    };
  } catch (error: any) {
    console.error("Error in getResearchStatus:", error);
    throw new Error(`Failed to get research status: ${error.message}`);
  }
};

export const getAgentLogs = async (sessionId: string, userId: string) => {
  try {
    const agentRun = await prisma.agentRun.findFirst({
      where: {
        sessionId: sessionId,
        session: {
          userId: userId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!agentRun) {
      throw new Error("Research session not found");
    }

    const output = agentRun.output as any;
    return {
      logs: output.logs || []
    };
  } catch (error: any) {
    console.error("Error in getAgentLogs:", error);
    throw new Error(`Failed to get agent logs: ${error.message}`);
  }
};

export const getSources = async (sessionId: string, userId: string) => {
  try {
    const agentRun = await prisma.agentRun.findFirst({
      where: {
        sessionId: sessionId,
        session: {
          userId: userId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!agentRun) {
      throw new Error("Research session not found");
    }

    const output = agentRun.output as any;
    return {
      sources: output.sources || []
    };
  } catch (error: any) {
    console.error("Error in getSources:", error);
    throw new Error(`Failed to get sources: ${error.message}`);
  }
};

export const analyzeResearch = async (sessionId: string, analysisType: string, userId: string) => {
  try {
    const agentRun = await prisma.agentRun.findFirst({
      where: {
        sessionId: sessionId,
        session: {
          userId: userId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!agentRun) {
      throw new Error("Research session not found");
    }

    const output = agentRun.output as any;
    return {
      analysis: output.analysis || {},
      analysisType: analysisType
    };
  } catch (error: any) {
    console.error("Error in analyzeResearch:", error);
    throw new Error(`Failed to analyze research: ${error.message}`);
  }
};

export const getReport = async (sessionId: string, userId: string) => {
  try {
    const agentRun = await prisma.agentRun.findFirst({
      where: {
        sessionId: sessionId,
        session: {
          userId: userId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!agentRun) {
      throw new Error("Research session not found");
    }

    const output = agentRun.output as any;
    return {
      report: output.report || '',
      metadata: output.metadata || {},
      status: agentRun.status
    };
  } catch (error: any) {
    console.error("Error in getReport:", error);
    throw new Error(`Failed to get report: ${error.message}`);
  }
};

export const addFeedback = async (sessionId: string, feedback: string, refinementRequest: string, userId: string) => {
  try {
    const agentRun = await prisma.agentRun.findFirst({
      where: {
        sessionId: sessionId,
        session: {
          userId: userId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!agentRun) {
      throw new Error("Research session not found");
    }

    const output = agentRun.output as any;
    
    // Refine the research based on feedback using agent
    const refinedAgentRunId = await researchAgent.refineResearch(agentRun.id, feedback);

    return {
      message: "Research refined successfully",
      agentRunId: refinedAgentRunId,
      status: "completed"
    };
  } catch (error: any) {
    console.error("Error in addFeedback:", error);
    throw new Error(`Failed to add feedback: ${error.message}`);
  }
};
