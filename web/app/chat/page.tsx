'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface ResearchSession {
  sessionId: string;
  agentRunId: string;
  status: string;
  message: string;
}

interface ResearchResult {
  sessionId: string;
  report: string;
  status: string;
  metadata: {
    confidence_level: number;
    analysis_duration: number;
    sources_collected: number;
    total_tokens_used: number;
  };
}

interface Source {
  title: string;
  url: string;
  content: string;
  source_type: string;
  relevance_score: number;
}

export default function ChatPage() {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep' | 'comprehensive'>('deep');
  const [loading, setLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'logs'>('chat');
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user is authenticated
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) {
      router.push('/signin');
      return;
    }
  }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [researchResult, logs]);

  const startResearch = async () => {
    if (!query.trim()) {
      setError('Please enter a research query');
      return;
    }

    setLoading(true);
    setError('');
    setCurrentSession(null);
    setResearchResult(null);
    setSources([]);
    setLogs([]);

    try {
      const response = await fetch('http://localhost:8080/research/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          depth,
        }),
      });

      if (response.ok) {
        const session: ResearchSession = await response.json();
        setCurrentSession(session);
        
        // Start polling for status
        pollResearchStatus(session.sessionId);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to start research');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pollResearchStatus = async (sessionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8080/research/status/${sessionId}`);
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            await fetchResearchResults(sessionId);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setError('Research failed. Please try again.');
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const fetchResearchResults = async (sessionId: string) => {
    try {
      // Fetch report
      const reportResponse = await fetch(`http://localhost:8080/research/report/${sessionId}`);
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        setResearchResult(reportData);
      }

      // Fetch sources
      const sourcesResponse = await fetch(`http://localhost:8080/research/sources/${sessionId}`);
      if (sourcesResponse.ok) {
        const sourcesData = await sourcesResponse.json();
        setSources(sourcesData.sources || []);
      }

      // Fetch logs
      const logsResponse = await fetch(`http://localhost:8080/research/logs/${sessionId}`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.logs || []);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Askademic</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Research Assistant</span>
              <button
                onClick={handleSignOut}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Research Chat</h2>
                <p className="text-sm text-gray-600">Ask me anything and I'll research it for you</p>
              </div>

              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {currentSession && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">AI</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-indigo-50 rounded-lg p-3">
                        <p className="text-sm text-gray-900">
                          I'm researching: <strong>"{query}"</strong>
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Status: {currentSession.status} • {currentSession.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {researchResult && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">✓</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-sm text-gray-900 font-medium">Research Complete!</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Confidence: {(researchResult.metadata.confidence_level * 100).toFixed(1)}% • 
                          Sources: {researchResult.metadata.sources_collected} • 
                          Duration: {Math.round(researchResult.metadata.analysis_duration / 1000)}s
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">!</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-sm text-red-900">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="px-6 py-4 border-t">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Research Query
                    </label>
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter your research question..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Research Depth
                    </label>
                    <select
                      value={depth}
                      onChange={(e) => setDepth(e.target.value as 'quick' | 'deep' | 'comprehensive')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loading}
                    >
                      <option value="quick">Quick (Basic analysis)</option>
                      <option value="deep">Deep (Comprehensive analysis)</option>
                      <option value="comprehensive">Comprehensive (In-depth research)</option>
                    </select>
                  </div>

                  <button
                    onClick={startResearch}
                    disabled={loading || !query.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Researching...' : 'Start Research'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tabs */}
              <div className="border-b">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'chat'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Results
                  </button>
                  <button
                    onClick={() => setActiveTab('sources')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'sources'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Sources
                  </button>
                  <button
                    onClick={() => setActiveTab('logs')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'logs'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Logs
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'chat' && researchResult && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Research Report</h3>
                      <div className="prose prose-sm max-h-96 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ 
                          __html: researchResult.report.replace(/\n/g, '<br>') 
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'sources' && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Sources ({sources.length})</h3>
                    {sources.map((source, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          {source.title}
                        </h4>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-500 block mb-2"
                        >
                          {source.url}
                        </a>
                        <p className="text-xs text-gray-600 line-clamp-3">
                          {source.content}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          Relevance: {(source.relevance_score * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">Process Logs</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {logs.map((log, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!researchResult && activeTab === 'chat' && (
                  <div className="text-center text-gray-500 py-8">
                    <p>Start a research query to see results here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
