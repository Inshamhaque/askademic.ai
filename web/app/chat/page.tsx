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

interface ChatMessage {
  id: string;
  query: string;
  depth: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ResearchResult;
  sources?: Source[];
  logs?: string[];
}

export default function ChatPage() {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep' | 'comprehensive'>('deep');
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'logs'>('chat');
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   // Check if user is authenticated
  //   const sessionToken = localStorage.getItem('sessionToken');
  //   if (!sessionToken) {
  //     router.push('/signin');
  //     return;
  //   }
  // }, [router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const getAuthHeaders = () => {
    const sessionToken = localStorage.getItem('sessionToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    };
  };

  const startResearch = async () => {
    if (!query.trim()) {
      setError('Please enter a research query');
      return;
    }

    setLoading(true);
    setError('');

    // Create a new chat message
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      query: query.trim(),
      depth,
      timestamp: new Date(),
      status: 'pending'
    };

    setChatMessages(prev => [...prev, newMessage]);
    setSelectedMessage(newMessage);

    try {
      const response = await fetch('http://localhost:8080/research/initiate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          query: query.trim(),
          depth,
        }),
      });

      if (response.ok) {
        const session: ResearchSession = await response.json();
        
        // Update message with session info
        setChatMessages(prev => prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'processing', sessionId: session.sessionId }
            : msg
        ));
        
        // Start polling for status
        pollResearchStatus(session.sessionId, newMessage.id);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to start research');
        setChatMessages(prev => prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        ));
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setChatMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, status: 'failed' }
          : msg
      ));
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  const pollResearchStatus = async (sessionId: string, messageId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8080/research/status/${sessionId}`, {
          headers: getAuthHeaders()
        });
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            await fetchResearchResults(sessionId, messageId);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setChatMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { ...msg, status: 'failed' }
                : msg
            ));
          }
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const fetchResearchResults = async (sessionId: string, messageId: string) => {
    try {
      // Fetch report
      const reportResponse = await fetch(`http://localhost:8080/research/report/${sessionId}`, {
        headers: getAuthHeaders()
      });
      let result: ResearchResult | undefined;
      if (reportResponse.ok) {
        result = await reportResponse.json();
      }

      // Fetch sources
      const sourcesResponse = await fetch(`http://localhost:8080/research/sources/${sessionId}`, {
        headers: getAuthHeaders()
      });
      let sources: Source[] = [];
      if (sourcesResponse.ok) {
        const sourcesData = await sourcesResponse.json();
        sources = sourcesData.sources || [];
      }

      // Fetch logs
      const logsResponse = await fetch(`http://localhost:8080/research/logs/${sessionId}`, {
        headers: getAuthHeaders()
      });
      let logs: string[] = [];
      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        logs = logsData.logs || [];
      }

      // Update message with results
      setChatMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              status: 'completed', 
              result, 
              sources, 
              logs 
            }
          : msg
      ));

      // Update selected message if it's the current one
      setSelectedMessage(prev => 
        prev?.id === messageId 
          ? { 
              ...prev, 
              status: 'completed', 
              result, 
              sources, 
              logs 
            }
          : prev
      );

    } catch (err) {
      console.error('Error fetching results:', err);
      setChatMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'failed' }
          : msg
      ));
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('http://localhost:8080/user/signout', {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (err) {
      console.error('Signout error:', err);
    } finally {
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'processing': return 'text-yellow-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✓';
      case 'processing': return '⏳';
      case 'failed': return '✗';
      default: return '○';
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Panel - Chat History */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No research queries yet
                  </div>
                ) : (
                  <div className="divide-y">
                    {chatMessages.map((message) => (
                      <button
                        key={message.id}
                        onClick={() => setSelectedMessage(message)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition ${
                          selectedMessage?.id === message.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {message.query}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTimestamp(message.timestamp)}
                            </p>
                          </div>
                          <div className={`ml-2 text-sm ${getStatusColor(message.status)}`}>
                            {getStatusIcon(message.status)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Panel - Chat Interface */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Research Chat</h2>
                <p className="text-sm text-gray-600">Ask me anything and I'll research it for you</p>
              </div>

              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto p-6 space-y-4">
                {selectedMessage && (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">AI</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-indigo-50 rounded-lg p-3">
                          <p className="text-sm text-gray-900">
                            I'm researching: <strong>"{selectedMessage.query}"</strong>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Status: {selectedMessage.status} • Depth: {selectedMessage.depth}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedMessage.status === 'completed' && selectedMessage.result && (
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
                              Confidence: {(selectedMessage.result.metadata.confidence_level * 100).toFixed(1)}% • 
                              Sources: {selectedMessage.result.metadata.sources_collected} • 
                              Duration: {Math.round(selectedMessage.result.metadata.analysis_duration / 1000)}s
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedMessage.status === 'failed' && (
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">!</span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-sm text-red-900">Research failed. Please try again.</p>
                          </div>
                        </div>
                      </div>
                    )}
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
                {activeTab === 'chat' && selectedMessage?.result && (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">Research Report</h3>
                      <div className="prose prose-sm max-h-96 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ 
                          __html: selectedMessage.result.report.replace(/\n/g, '<br>') 
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'sources' && selectedMessage?.sources && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Sources ({selectedMessage.sources.length})</h3>
                    {selectedMessage.sources.map((source, index) => (
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

                {activeTab === 'logs' && selectedMessage?.logs && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">Process Logs</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {selectedMessage.logs.map((log, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedMessage && (
                  <div className="text-center text-gray-500 py-8">
                    <p>Select a research query to see results</p>
                  </div>
                )}

                {selectedMessage && !selectedMessage.result && activeTab === 'chat' && (
                  <div className="text-center text-gray-500 py-8">
                    <p>Research in progress...</p>
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
