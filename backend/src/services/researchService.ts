import { prisma } from "../lib/db.js";
import researchAgent from "../agents/researchAgent.js";
import crypto from "crypto";

export const listUserSessions = async (userId: string) => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: userId,
        query: { not: null } // Only include sessions with a query (research sessions)
      },
      include: {
        agentRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sessions.map(s => ({
      id: s.id,
      createdAt: s.createdAt,
      query: s.query || 'Untitled Research',
      depth: s.depth || 'deep',
      latestStatus: s.agentRuns[0]?.status || s.status || 'unknown'
    }));
  } catch (error) {
    console.error('Error listing user sessions:', error);
    throw new Error('Failed to list sessions');
  }
};

export const initiateResearch = async (query: string, depth: string, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error("User not found");
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const session = await prisma.session.create({
      data: {
        userId: userId,
        token: sessionToken,
        query: query,
        depth: depth,
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

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

    // Fetch session to access the original query for relevance scoring
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    const queryText = (session?.query || '').toLowerCase();

    const output = agentRun.output as any;
    const rawSources: Array<any> = output.sources || [];

    const sanitizeContent = (text: string): string => {
      if (!text) return '';
      let t = text
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\bEnable JavaScript and cookies to continue\b/gi, ' ')
        .replace(/window\._cf_chl_opt[\s\S]*$/i, ' ')
        .replace(/function\s*\([^)]*\)\s*\{[\s\S]*?\}/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return t;
    };

    const summarize = (text: string, maxLen = 280): string => {
      const cleaned = sanitizeContent(text);
      if (!cleaned) return '';
      if (cleaned.length <= maxLen) return cleaned;
      const sentences = cleaned.split(/(?<=[.!?])\s+/);
      let out = '';
      for (const s of sentences) {
        if ((out + ' ' + s).trim().length > maxLen) break;
        out = (out ? out + ' ' : '') + s;
      }
      if (!out) out = cleaned.slice(0, maxLen);
      return out.replace(/[,:;\-\s]+$/, '') + '…';
    };

    const computeRelevance = (content: string): number => {
      const cleaned = sanitizeContent(content).toLowerCase();
      if (!cleaned || !queryText) return 0;
      const queryTerms = Array.from(new Set(queryText.split(/[^a-z0-9]+/g).filter(Boolean)));
      if (queryTerms.length === 0) return 0;
      let hits = 0;
      for (const term of queryTerms) {
        const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');
        const count = (cleaned.match(re) || []).length;
        if (count > 0) hits += 1;
      }
      const score = hits / queryTerms.length;
      return Math.max(0, Math.min(1, score));
    };

    const enhanced = rawSources.map((s) => {
      const content = typeof s.content === 'string' ? s.content : '';
      const sanitized = sanitizeContent(content);
      const summary = s.summary || summarize(sanitized);
      const relevance = typeof s.relevance_score === 'number' ? s.relevance_score : computeRelevance(sanitized);
      return {
        title: s.title || '',
        url: s.url || '',
        content: sanitized,
        source_type: s.source_type || s.type || undefined,
        relevance_score: relevance,
        summary
      };
    });

    return {
      sources: enhanced
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
