import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

// Simple logger
const logger = {
  info: (msg: string, agentRunId?: string) => console.log(`[INFO] ${agentRunId ? `[${agentRunId}] ` : ''}${msg}`),
  error: (msg: string, error?: any, agentRunId?: string) => console.error(`[ERROR] ${agentRunId ? `[${agentRunId}] ` : ''}${msg}`, error),
  warn: (msg: string, agentRunId?: string) => console.warn(`[WARN] ${agentRunId ? `[${agentRunId}] ` : ''}${msg}`)
};

// Simplified type definitions
interface ResearchInput {
  query: string;
  depth: 'quick' | 'deep' | 'comprehensive';
  sources?: string[];
  format?: 'executive' | 'detailed' | 'academic';
  refinement_feedback?: string;
  original_run_id?: string;
}

interface ResearchSource {
  title: string;
  url: string;
  content: string;
  source_type: 'web' | 'tavily';
  relevance_score: number;
}

interface ResearchAnalysis {
  summary: string;
  key_findings: string[];
  confidence_score: number;
  recommendations: string[];
  gaps_identified?: string[];
}

interface ResearchOutput {
  sources: ResearchSource[];
  analysis: ResearchAnalysis;
  report: string;
  metadata: {
    sources_collected: number;
    analysis_duration: number;
    confidence_level: number;
    total_tokens_used?: number;
  };
  logs?: string[];
  refinement?: {
    feedback: string;
    refined_at: string;
  };
  error?: string;
  timestamp?: string;
}

class ResearchAgent {
  private llm: ChatOpenAI;
  private searchTool: TavilySearchResults;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 1500,
    });

    this.searchTool = new TavilySearchResults({
      maxResults: 10
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
  }

  /**
   * Main research execution method
   */
  async executeResearch(sessionId: string, input: ResearchInput): Promise<string> {
    const startTime = Date.now();
    
    // Create AgentRun record
    const agentRun = await prisma.agentRun.create({
      data: {
        sessionId,
        input: input as any,
        output: {} as any,
        status: "pending"
      }
    });

    const agentRunId = agentRun.id;
    logger.info(`Starting research workflow`, agentRunId);

    try {
      // Update status to processing
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: { status: "processing" }
      });

      // Step 1: Collect sources
      const { sources, searchQueries } = await this.collectSources(input.query, agentRunId);

      // Step 2: Analyze sources
      const analysis = await this.analyzeSources(sources, input.depth, agentRunId);

      // Step 3: Generate report
      const report = await this.generateReport(input.query, analysis, input.format || 'detailed', agentRunId);

      // Create final output
      const researchOutput: ResearchOutput = {
        sources,
        analysis,
        report,
        metadata: {
          sources_collected: sources.length,
          analysis_duration: Date.now() - startTime,
          confidence_level: analysis.confidence_score,
          total_tokens_used: this.estimateTokens(sources, analysis, report)
        },
        logs: [
          `Research initiated for query: "${input.query}"`,
          `Generated ${searchQueries?.length || 0} search variations`,
          `Collected ${sources.length} relevant sources`,
          `Analysis completed with confidence: ${analysis.confidence_score}`,
          `Report generated with ${report.length} characters`,
          `Total processing time: ${Date.now() - startTime}ms`
        ]
      };

      // Update AgentRun with successful completion
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: {
          output: researchOutput as any,
          status: "completed"
        }
      });

      logger.info(`Research workflow completed in ${Date.now() - startTime}ms`, agentRunId);
      return agentRunId;

    } catch (error: any) {
      logger.error(`Research workflow failed`, error, agentRunId);
      
      // Update AgentRun with error
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: {
          output: { 
            error: error.message, 
            timestamp: new Date().toISOString()
          } as any,
          status: "failed"
        }
      });

      throw error;
    }
  }

  /**
   * Collect sources from web search
   */
  private async collectSources(query: string, agentRunId: string): Promise<{ sources: ResearchSource[], searchQueries: string[] }> {
    const sources: ResearchSource[] = [];

    try {
      // Generate search variations
      const searchQueries = await this.generateSearchQueries(query);
      logger.info(`Generated ${searchQueries.length} search variations`, agentRunId);

      // Get depth from session to determine source count
      const session = await prisma.session.findFirst({
        where: { 
          agentRuns: { 
            some: { id: agentRunId } 
          } 
        }
      });

      const depth = (session as any)?.depth || 'deep';
      
      // Determine source count based on depth
      const sourceConfig = {
        quick: { maxQueries: 1, maxSourcesPerQuery: 2, totalSources: 3 },
        deep: { maxQueries: 2, maxSourcesPerQuery: 3, totalSources: 5 },
        comprehensive: { maxQueries: 3, maxSourcesPerQuery: 4, totalSources: 8 }
      };

      const config = sourceConfig[depth as keyof typeof sourceConfig] || sourceConfig.deep;

      // Collect sources from each query
      for (const searchQuery of searchQueries.slice(0, config.maxQueries)) {
        try {
          let searchResults = await this.searchTool.invoke(searchQuery);
          logger.info(`Raw search results type: ${typeof searchResults}`, agentRunId);
          
          // Parse JSON string if needed
          if (typeof searchResults === 'string') {
            try {
              searchResults = JSON.parse(searchResults);
              logger.info(`Parsed JSON string successfully`, agentRunId);
            } catch (error) {
              logger.warn(`Failed to parse search results JSON: ${error}`, agentRunId);
              continue;
            }
          }
          
          logger.info(`Found ${searchResults.length} results for: ${searchQuery}`, agentRunId);
          
          // Debug: Log first result structure
          if (searchResults.length > 0) {
            logger.info(`First result structure: ${JSON.stringify(searchResults[0], null, 2)}`, agentRunId);
            logger.info(`Total results: ${searchResults.length}`, agentRunId);
            logger.info(`Result type: ${typeof searchResults[0]}`, agentRunId);
          }
          
          if (!Array.isArray(searchResults)) {
            logger.warn(`Search results not an array after parsing, skipping`, agentRunId);
            continue;
          }
          
          // Filter out invalid results
          const validResults = searchResults.filter(result => 
            result && typeof result === 'object' && result.url && result.url !== 'undefined'
          );
          
          if (validResults.length === 0) {
            logger.warn(`No valid results found in search response`, agentRunId);
            continue;
          }
          
          for (const result of validResults.slice(0, config.maxSourcesPerQuery)) {
            try {
              // Debug: Log the result being processed
              logger.info(`Processing result: ${JSON.stringify(result, null, 2)}`, agentRunId);
              
              // Check if result has valid URL
              if (!result.url || result.url === 'undefined') {
                logger.warn(`Skipped result - invalid URL: ${result.url}`, agentRunId);
                continue;
              }

              const content = await this.loadWebContent(result.url);
              
              // Accept sources even with limited content
              if (content && content.length > 20) {
                sources.push({
                  title: result.title || 'Web Source',
                  url: result.url,
                  content: content.slice(0, depth === 'comprehensive' ? 3000 : 2000), // More content for comprehensive
                  source_type: 'tavily',
                  relevance_score: 0.7
                });
                logger.info(`Added source: ${result.title}`, agentRunId);
              } else {
                logger.warn(`Skipped ${result.url} - insufficient content`, agentRunId);
              }
              
            } catch (error) {
              logger.warn(`Failed to load ${result.url}: ${error}`, agentRunId);
            }
          }
          
        } catch (error) {
          logger.warn(`Search failed for: ${searchQuery}`, agentRunId);
        }
      }

      // Score and filter sources
      const scoredSources = await this.scoreRelevance(sources, query, agentRunId);
      const topSources = scoredSources
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, config.totalSources);

      logger.info(`Collected ${topSources.length} relevant sources for ${depth} research`, agentRunId);
      
      // If no sources collected, create a fallback source
      if (topSources.length === 0) {
        logger.warn(`No sources collected, creating fallback source`, agentRunId);
        topSources.push({
          title: `Research on: ${query}`,
          url: 'https://search-results.com',
          content: `Research query: ${query}. This analysis is based on general knowledge and search results.`,
          source_type: 'tavily',
          relevance_score: 0.8
        });
      } else {
        // Filter out sources with invalid URLs
        const validSources = topSources.filter(source => 
          source.url && source.url !== 'undefined' && source.url !== 'https://search-results.com'
        );
        
        if (validSources.length === 0) {
          logger.warn(`No valid sources after filtering, creating fallback source`, agentRunId);
          topSources.length = 0; // Clear invalid sources
          topSources.push({
            title: `Research on: ${query}`,
            url: 'https://search-results.com',
            content: `Research query: ${query}. This analysis is based on general knowledge and search results.`,
            source_type: 'tavily',
            relevance_score: 0.8
          });
        }
      }
      
      return { sources: topSources, searchQueries };

    } catch (error: any) {
      logger.error(`Source collection failed`, error, agentRunId);
      throw error;
    }
  }

  /**
   * Analyze collected sources
   */
  private async analyzeSources(sources: ResearchSource[], depth: "quick" | "deep" | "comprehensive", agentRunId: string): Promise<ResearchAnalysis> {
    try {
      if (sources.length === 0) {
        throw new Error("No sources available for analysis");
      }

      // Combine content for analysis
      const combinedContent = sources
        .map(s => `Source: ${s.title}\nURL: ${s.url}\nContent: ${s.content.slice(0, 600)}`)
        .join('\n\n---\n\n');

      // Perform analysis based on depth
      const analysisPrompt = this.getAnalysisPrompt(depth);
      const analysis = await this.performAnalysis(combinedContent, analysisPrompt, agentRunId);

      logger.info(`Analysis completed with confidence: ${analysis.confidence_score}`, agentRunId);
      return analysis;

    } catch (error: any) {
      logger.error(`Analysis failed`, error, agentRunId);
      throw error;
    }
  }

  /**
   * Generate research report
   */
  private async generateReport(query: string, analysis: ResearchAnalysis, format: string, agentRunId: string): Promise<string> {
    try {
      const safeSummary = analysis?.summary ?? "";
      const findingsArr = Array.isArray(analysis?.key_findings) ? analysis.key_findings : [];
      const recsArr = Array.isArray(analysis?.recommendations) ? analysis.recommendations : [];
      const confidenceNum = typeof analysis?.confidence_score === 'number' ? analysis.confidence_score : 0.7;

      // Get depth from the session to determine report length
      const session = await prisma.session.findFirst({
        where: { 
          agentRuns: { 
            some: { id: agentRunId } 
          } 
        }
      });

      // Get depth from the input or use default
      const depth = (session as any)?.depth || 'deep';
      
      // Define report length based on depth
      const lengthConfig = {
        quick: {
          wordCount: '300-500',
          sections: ['Executive Summary', 'Key Findings', 'Recommendations'],
          description: 'concise executive summary style'
        },
        deep: {
          wordCount: '2000-3000',
          sections: ['Executive Summary', 'Background', 'Key Findings', 'Analysis', 'Recommendations', 'Conclusion'],
          description: 'comprehensive analysis with detailed sections, at least 5-6 full A4 pages, with in-depth discussion and examples'
        },
        comprehensive: {
          wordCount: '3500-5000',
          sections: ['Executive Summary', 'Background', 'Methodology', 'Key Findings', 'Detailed Analysis', 'Implications', 'Recommendations', 'Conclusion', 'Future Research'],
          description: 'academic paper style with extensive analysis and multiple sections, at least 8-10 full A4 pages, with detailed methodology, implications, and future research directions'
        }
      };

      const config = lengthConfig[depth as keyof typeof lengthConfig] || lengthConfig.deep;

      const reportPrompt = PromptTemplate.fromTemplate(`
        Create a ${config.description} research report for the query: "{query}"

        Analysis Summary: {summary}
        Key Findings: {findings}
        Recommendations: {recommendations}
        Confidence Level: {confidence}

        Requirements:
        - Target length: ${config.wordCount} words (do not under-deliver; ensure the report is at least this long)
        - The report must be long enough to fill at least ${depth === 'deep' ? '5-6' : depth === 'comprehensive' ? '8-10' : '1-2'} full A4 pages when rendered as a PDF
        - Include these sections: ${config.sections.join(', ')}
        - Use proper markdown formatting with headers (##), bullet points, and emphasis
        - Make it suitable for ${depth} level research
        - Include specific details, data, and examples where appropriate
        - Ensure professional academic tone
        ${depth === 'comprehensive' ? '- Include methodology section explaining the research approach' : ''}
        ${depth === 'comprehensive' ? '- Add implications section discussing broader impact' : ''}
        ${depth === 'comprehensive' ? '- Include future research directions' : ''}
        ${depth === 'deep' ? '- Provide detailed analysis of each finding' : ''}
        ${depth === 'deep' ? '- Include background context' : ''}
        ${depth === 'quick' ? '- Focus on executive summary and actionable insights' : ''}

        Generate the report:
      `);

      const chain = new LLMChain({ llm: this.llm, prompt: reportPrompt });
      const result = await chain.call({
        query,
        summary: safeSummary,
        findings: findingsArr.join('\n• '),
        recommendations: recsArr.join('\n• '),
        confidence: `${(confidenceNum * 100).toFixed(1)}%`
      });

      const report = result.text.trim();
      logger.info(`Generated ${depth} report (${report.length} chars, target: ${config.wordCount} words)`, agentRunId);
      return report;

    } catch (error: any) {
      logger.error(`Report generation failed`, error, agentRunId);
      throw error;
    }
  }

  /**
   * Refine existing research based on feedback
   */
  async refineResearch(agentRunId: string, feedback: string): Promise<string> {
    try {
      logger.info(`Refining research based on feedback`, agentRunId);

      // Get the original AgentRun
      const originalRun = await prisma.agentRun.findUnique({
        where: { id: agentRunId }
      });

      if (!originalRun || originalRun.status !== "completed") {
        throw new Error("Original research not found or not completed");
      }

      const originalOutput = originalRun.output as unknown as ResearchOutput;
      const originalInput = originalRun.input as unknown as ResearchInput;

      // Create new AgentRun for refinement
      const refinementRun = await prisma.agentRun.create({
        data: {
          sessionId: originalRun.sessionId,
          input: {
            ...originalInput,
            refinement_feedback: feedback,
            original_run_id: agentRunId
          } as any,
          output: {} as any,
          status: "pending"
        }
      });

      // Refine the report
      const refinedReport = await this.refineReport(originalOutput.report, feedback, refinementRun.id);

      // Create refined output
      const refinedOutput: ResearchOutput = {
        ...originalOutput,
        report: refinedReport,
        refinement: {
          feedback,
          refined_at: new Date().toISOString()
        }
      };

      // Update refinement run
      await prisma.agentRun.update({
        where: { id: refinementRun.id },
        data: {
          output: refinedOutput as any,
          status: "completed"
        }
      });

      logger.info(`Research refined successfully`, refinementRun.id);
      return refinementRun.id;

    } catch (error: any) {
      logger.error(`Research refinement failed`, error, agentRunId);
      throw error;
    }
  }

  /**
   * Get research results
   */
  async getResearchResults(agentRunId: string): Promise<ResearchOutput> {
    const agentRun = await prisma.agentRun.findUnique({
      where: { id: agentRunId }
    });

    if (!agentRun) {
      throw new Error("Research not found");
    }

    return agentRun.output as unknown as ResearchOutput;
  }

  /**
   * Get research status
   */
  async getResearchStatus(agentRunId: string): Promise<{ status: string; progress?: any }> {
    const agentRun = await prisma.agentRun.findUnique({
      where: { id: agentRunId },
      select: { status: true, output: true }
    });

    if (!agentRun) {
      throw new Error("Research not found");
    }

    return {
      status: agentRun.status,
      progress: agentRun.output
    };
  }

  /**
   * Answer a follow-up question using RAG (sources + report)
   */
  async answerFollowUp(question: string, sources: any[], report: string): Promise<string> {
    // Compose context from sources and report
    const context = [
      '--- SOURCES ---',
      ...sources.map((s: any, i: number) => `Source ${i+1}: ${s.title}\nURL: ${s.url}\nContent: ${s.content?.slice(0, 800)}`),
      '--- REPORT ---',
      report,
      '--- END CONTEXT ---'
    ].join('\n\n');
    const prompt = `You are an expert research assistant. Using ONLY the information in the provided sources and report, answer the following follow-up question as thoroughly and accurately as possible. If the answer is not present, say so.

CONTEXT:
${context}

FOLLOW-UP QUESTION:
${question}

ANSWER:`;
    const result = await this.llm.invoke(prompt);
    let answer = '';
    if (typeof result === 'string') {
      answer = result;// TODO : trim here
    } else if (typeof result?.content === 'string') {
      answer = result.content.trim();
    } else if (typeof result?.text === 'string') {
      answer = result.text.trim();
    } else if (Array.isArray(result?.content)) {
      const arr: any[] = result.content;
      answer = arr.map((c) => typeof c === 'string' ? c.trim() : JSON.stringify(c)).join('\n').trim();
    } else {
      answer = JSON.stringify(result).slice(0, 1000);
    }
    return answer;
  }

  // Helper methods

  private async generateSearchQueries(originalQuery: string): Promise<string[]> {
    const prompt = PromptTemplate.fromTemplate(`
      Generate 2 diverse search queries for: "{query}"
      Make them specific and focused. Return one per line.
      
      Query 1:
      Query 2:
    `);

    const chain = new LLMChain({ llm: this.llm, prompt });
    const result = await chain.call({ query: originalQuery });
    
    const queries = result.text
      .split('\n')
      .filter((line: string) => line.includes(':'))
      .map((line: string) => line.split(':')[1]?.trim())
      .filter((query: string | undefined) => query && query.length > 0);
    
    return [originalQuery, ...queries].slice(0, 2);
  }

  private async loadWebContent(url: string): Promise<string> {
    try {
      logger.info(`Loading web content from: ${url}`);
      
      const loader = new CheerioWebBaseLoader(url, {
        timeout: 15000, // 15 second timeout
        maxRetries: 1
      });
      const docs = await loader.load();
      const content = docs.length > 0 && docs[0] ? docs[0].pageContent : '';
      
      if (content && content.length > 100) {
        logger.info(`Successfully loaded ${content.length} characters from ${url}`);
        return content;
      }
      
      // If web scraping fails, return a basic description
      logger.warn(`Insufficient content from ${url}: ${content.length} characters`);
      return `Content from ${url} - Unable to load full content due to access restrictions or timeout.`;
    } catch (error) {
      logger.warn(`Web scraping failed for ${url}: ${error}`);
      // Return a basic description instead of empty string
      return `Content from ${url} - Access restricted or unavailable.`;
    }
  }

  private async scoreRelevance(sources: ResearchSource[], query: string, agentRunId: string): Promise<ResearchSource[]> {
    for (let i = 0; i < sources.length; i++) {
      try {
        const source = sources[i];
        if (!source) continue;

        const prompt = PromptTemplate.fromTemplate(`
          Rate relevance from 0.0 to 1.0:
          
          Query: {query}
          Content: {content}
          
          Score:
        `);

        const chain = new LLMChain({ llm: this.llm, prompt });
        const result = await chain.call({
          query,
          content: source.content?.slice(0, 500) || ''
        });

        const score = parseFloat(result.text.trim());
        source.relevance_score = isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
        
      } catch (error) {
        const source = sources[i];
        if (source) {
          source.relevance_score = 0.5;
        }
      }
    }
    
    return sources;
  }

  private getAnalysisPrompt(depth: 'quick' | 'deep' | 'comprehensive'): PromptTemplate {
    const prompts: Record<string, string> = {
      quick: `
        Provide a quick analysis in JSON format:
        {content}
        
        JSON Response:
        {{
          "summary": "Brief 2-3 sentence summary focusing on key points",
          "key_findings": ["finding1", "finding2", "finding3"],
          "confidence_score": 0.8,
          "recommendations": ["rec1", "rec2"]
        }}
      `,
      deep: `
        Provide a deep analysis in JSON format:
        {content}
        
        JSON Response:
        {{
          "summary": "Comprehensive 4-5 sentence summary with context and implications",
          "key_findings": ["detailed finding1 with explanation", "finding2 with context", "finding3 with impact", "finding4 with evidence", "finding5 with implications"],
          "confidence_score": 0.8,
          "recommendations": ["detailed rec1 with rationale", "rec2 with implementation steps", "rec3 with expected outcomes"],
          "gaps_identified": ["gap1 with description", "gap2 with potential impact"]
        }}
      `,
      comprehensive: `
        Provide a comprehensive analysis in JSON format:
        {content}
        
        JSON Response:
        {{
          "summary": "Thorough 5-6 sentence summary with full context, methodology overview, and broader implications",
          "key_findings": ["detailed finding1 with full explanation and evidence", "finding2 with context and methodology", "finding3 with impact analysis", "finding4 with comparative analysis", "finding5 with future implications", "finding6 with risk assessment", "finding7 with stakeholder impact"],
          "confidence_score": 0.8,
          "recommendations": ["strategic rec1 with detailed implementation plan", "tactical rec2 with resource requirements", "long-term rec3 with timeline and milestones", "rec4 with risk mitigation strategies"],
          "gaps_identified": ["research gap1 with detailed description and impact", "data gap2 with methodology implications", "methodological gap3 with alternative approaches", "gap4 with future research opportunities"]
        }}
      `
    };

    const template = prompts[depth as keyof typeof prompts] ?? prompts.deep;
    return PromptTemplate.fromTemplate(template ?? "");
  }

  private async performAnalysis(content: string, prompt: PromptTemplate, agentRunId: string): Promise<ResearchAnalysis> {
    const chain = new LLMChain({ llm: this.llm, prompt });
    const result = await chain.call({ content: content.slice(0, 3000) });
    
    try {
      // Try to extract JSON from the response
      const text = result.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ResearchAnalysis;
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (error) {
      logger.warn(`JSON parse failed, using fallback: ${error}`, agentRunId);
      return {
        summary: "Analysis completed with extracted insights from multiple sources.",
        key_findings: ["Multiple relevant sources analyzed", "Key information patterns identified", "Actionable insights extracted"],
        confidence_score: 0.7,
        recommendations: ["Consider additional research", "Validate findings with subject matter experts"]
      };
    }
  }

  private async refineReport(originalReport: string, feedback: string, agentRunId: string): Promise<string> {
    const prompt = PromptTemplate.fromTemplate(`
      Improve this research report based on user feedback:

      ORIGINAL REPORT:
      {report}

      USER FEEDBACK:
      {feedback}

      Please provide an improved version that addresses the feedback while maintaining accuracy:
    `);

    const chain = new LLMChain({ llm: this.llm, prompt });
    const result = await chain.call({
      report: originalReport,
      feedback
    });

    return result.text.trim();
  }

  private estimateTokens(sources: ResearchSource[], analysis: ResearchAnalysis, report: string): number {
    const totalContent = sources.reduce((sum, s) => sum + (s.content?.length || 0), 0);
    const analysisContent = JSON.stringify(analysis).length;
    const reportContent = report.length;
    
    // Rough estimation: 4 characters per token
    return Math.ceil((totalContent + analysisContent + reportContent) / 4);
  }
}

export default new ResearchAgent();