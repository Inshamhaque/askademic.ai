import { PrismaClient } from "../generated/prisma/index.js";
import researchAgent from "../agents/researchAgent.js";

const prisma = new PrismaClient();

export const initiateResearch = async (query: string, depth: "quick" | "deep" | "comprehensive", sources?: string[]) => {
  try {
    // Create a session first (you'll need to handle user creation/auth properly)
    // For now, we'll create a default user if it doesn't exist
    let user = await prisma.user.findFirst({
      where: { email: "default@askademic.ai" }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "default@askademic.ai",
          name: "Default User",
          password: "default-password" // In production, handle auth properly
        }
      });
    }

    const session = await prisma.session.create({
      data: { 
        userId: user.id
      }
    });

    // Start the research using the agent
    const agentRunId = await researchAgent.executeResearch(session.id, {
      query,
      depth,
      sources: sources || []
    });

    return {
      sessionId: session.id,
      agentRunId,
      status: "initiated",
      message: "Research initiated, processing..."
    };
  } catch (error: any) {
    throw new Error(`Failed to initiate research: ${error.message}`);
  }
};

export const getSources = async (sessionId: string) => {
  try {
    // Get the latest agent run for this session
    const agentRun = await prisma.agentRun.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" }
    });

    if (!agentRun) {
      throw new Error("No research found for this session");
    }

    const output = agentRun.output as any;
    return { 
      sessionId, 
      sources: output?.sources || [],
      status: agentRun.status
    };
  } catch (error: any) {
    throw new Error(`Failed to get sources: ${error.message}`);
  }
};

export const analyzeResearch = async (sessionId: string, analysisLevel: "quick" | "deep" | "comprehensive") => {
  try {
    // Get the latest agent run for this session
    const agentRun = await prisma.agentRun.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" }
    });

    if (!agentRun) {
      throw new Error("No research found for this session");
    }

    const output = agentRun.output as any;
    return {
      sessionId,
      analysis: output?.analysis || {},
      status: agentRun.status
    };
  } catch (error: any) {
    throw new Error(`Failed to analyze research: ${error.message}`);
  }
};

export const getReport = async (sessionId: string) => {
  try {
    // Get the latest agent run for this session
    const agentRun = await prisma.agentRun.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" }
    });

    if (!agentRun) {
      throw new Error("No research found for this session");
    }

    const output = agentRun.output as any;
    return { 
      sessionId, 
      report: output?.report || "",
      status: agentRun.status,
      metadata: output?.metadata || {}
    };
  } catch (error: any) {
    throw new Error(`Failed to get report: ${error.message}`);
  }
};

export const addFeedback = async (sessionId: string, feedback: string) => {
  try {
    // Get the latest agent run for this session
    const agentRun = await prisma.agentRun.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" }
    });

    if (!agentRun) {
      throw new Error("No research found for this session");
    }

    // Use the research agent to refine the report
    const refinedAgentRunId = await researchAgent.refineResearch(agentRun.id, feedback);

    return { 
      sessionId, 
      originalAgentRunId: agentRun.id,
      refinedAgentRunId,
      message: "Research refined based on feedback"
    };
  } catch (error: any) {
    throw new Error(`Failed to add feedback: ${error.message}`);
  }
};

export const getResearchStatus = async (sessionId: string) => {
  try {
    const agentRun = await prisma.agentRun.findFirst({
      where: { sessionId },
      orderBy: { createdAt: "desc" }
    });

    if (!agentRun) {
      return { sessionId, status: "not_found" };
    }

    return {
      sessionId,
      agentRunId: agentRun.id,
      status: agentRun.status,
      createdAt: agentRun.createdAt
    };
  } catch (error: any) {
    throw new Error(`Failed to get research status: ${error.message}`);
  }
};
