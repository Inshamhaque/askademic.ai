"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Logo from "../../components/Logo";
import ProfileDropdown from "../../components/ProfileDropdown";
import ReactMarkdown from "react-markdown";
import PdfDownload from "../../components/PdfDownload";

interface ResearchResult {
  report: string;
  status: string;
  metadata: {
    confidence_level?: number;
    analysis_duration?: number;
    sources_collected?: number;
    total_tokens_used?: number;
  };
}

interface Source {
  title: string;
  url: string;
  content: string;
  source_type?: string;
  relevance_score?: number;
}

interface SessionItem {
  id: string;
  createdAt: string;
  query: string;
  depth: string;
  latestStatus: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}



export default function ChatSessionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const sessionId = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("pending");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"results" | "sources" | "logs">("results");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionItem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [uploading, setUploading] = useState(false);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    };
  };

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`https://askademic-ai.onrender.com/research/sessions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        
        // Find current session
        const current = data.sessions?.find((s: SessionItem) => s.id === sessionId);
        if (current) {
          setCurrentSession(current);
        }
      } else if (res.status === 401) {
        router.push("/signin");
      }
    } catch {}
  }, [sessionId, router]);

  const fetchAll = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError("");

      const [statusRes, reportRes, sourcesRes, logsRes] = await Promise.all([
        fetch(`https://askademic-ai.onrender.com/research/status/${sessionId}`, { headers: getAuthHeaders() }),
        fetch(`https://askademic-ai.onrender.com/research/report/${sessionId}`, { headers: getAuthHeaders() }),
        fetch(`https://askademic-ai.onrender.com/research/sources/${sessionId}`, { headers: getAuthHeaders() }),
        fetch(`https://askademic-ai.onrender.com/research/logs/${sessionId}`, { headers: getAuthHeaders() }),
      ]);

      if (statusRes.ok) {
        const s = await statusRes.json();
        setStatus(s.status || "unknown");
      } else if (statusRes.status === 401) {
        router.push("/signin");
        return;
      }

      if (reportRes.ok) {
        const r = await reportRes.json();
        setResult(r);
      }
      if (sourcesRes.ok) {
        const s = await sourcesRes.json();
        setSources(s.sources || []);
      }
      if (logsRes.ok) {
        const l = await logsRes.json();
        setLogs(l.logs || []);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load session");
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    const userData = localStorage.getItem("user");
    
    if (!token) {
      router.push("/signin");
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }

    loadSessions();
  }, [router, loadSessions]);

  useEffect(() => {
    if (!sessionId) return;

    fetchAll();

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`https://askademic-ai.onrender.com/research/status/${sessionId}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const s = await res.json();
          setStatus(s.status || "unknown");
          if (s.status === "completed" || s.status === "failed") {
            clearInterval(pollRef.current as NodeJS.Timeout);
            await fetchAll();
          }
        } else if (res.status === 401) {
          clearInterval(pollRef.current as NodeJS.Timeout);
          router.push("/signin");
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, router, fetchAll]);

  const isActive = (id: string) => id === sessionId;

  const getDomain = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const summarizeText = (text: string, maxLen: number = 280) => {
    if (!text) return '';
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxLen) return cleaned;
    // Try sentence-aware truncation
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    let out = '';
    for (const s of sentences) {
      if ((out + ' ' + s).trim().length > maxLen) break;
      out = (out ? out + ' ' : '') + s;
    }
    if (!out) out = cleaned.slice(0, maxLen);
    return out.replace(/[,:;\-\s]+$/, '') + '…';
  };

  return (
    <div className="max-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            {user && <ProfileDropdown user={user} />}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-4rem)] overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="lg:col-span-1 h-full min-h-0">
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 h-full flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-white">Your Sessions</h2>
              <Link href="/chat" className="text-xs text-indigo-400 hover:text-indigo-300">+ New</Link>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-700 min-h-0">
              {sessions.length === 0 ? (
                <div className="p-4 text-sm text-gray-400">No sessions yet</div>
              ) : (
                sessions.map(s => (
                  <Link key={s.id} href={`/chat/${s.id}`} className={`block p-4 hover:bg-gray-700 ${isActive(s.id) ? 'bg-indigo-900/20' : ''}`}>
                    <div className="text-sm font-medium text-white truncate">{s.query}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${s.latestStatus === 'completed' ? 'bg-green-500' : s.latestStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                        <span className="capitalize">{s.latestStatus}</span>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300 capitalize">
                        {s.depth}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 h-full min-h-0">
          {loading ? (
            <div className="flex-col bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8 text-center h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-gray-400 ml-4">Loading research session...</p>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg h-full">
              {error}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 h-full flex flex-col min-h-0">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-700 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-white">{currentSession?.query}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${status === 'completed' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                      <span className="text-sm text-gray-400 capitalize">{status}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-400 capitalize">{currentSession?.depth}</span>
                    </div>
                  </div>
                  {currentSession && result && (
                    <PdfDownload
                      report={result.report || ""}
                      query={currentSession.query}
                      depth={currentSession.depth}
                      status={status}
                      sourcesCount={sources.length}
                      sources={sources}
                      onDownloadStart={() => {}}
                      onDownloadComplete={() => {}}
                    />
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-700 shrink-0">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'results', label: 'Results' },
                    { id: 'sources', label: 'Sources' },
                    { id: 'logs', label: 'Logs' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as "results" | "sources" | "logs")}
                      className={`py-3 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 flex-1 overflow-y-auto min-h-0">
                {activeTab === 'results' && (
                  <div>
                    {result?.report ? (
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-semibold text-white mb-3 mt-6">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-medium text-white mb-2 mt-4">{children}</h3>,
                            p: ({ children }) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-300">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-300">{children}</em>,
                            code: ({ children }) => <code className="bg-gray-700 px-2 py-1 rounded text-sm font-mono text-gray-200">{children}</code>,
                            pre: ({ children }) => <pre className="bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm text-gray-200 mb-4">{children}</pre>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-400 mb-4">{children}</blockquote>,
                            a: ({ children, href }) => <a href={href} className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                            table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="min-w-full border border-gray-600">{children}</table></div>,
                            th: ({ children }) => <th className="border border-gray-600 px-4 py-2 text-left font-semibold text-white bg-gray-700">{children}</th>,
                            td: ({ children }) => <td className="border border-gray-600 px-4 py-2 text-gray-300">{children}</td>,
                          }}
                        >
                          {result.report}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Generating research report...</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'sources' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-white font-semibold">Sources ({sources.length})</h3>
                        <p className="text-xs text-gray-400">Provider results + your uploaded documents</p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded cursor-pointer">
                        <input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !sessionId) return;
                            setUploading(true);
                            try {
                              const arrayBuffer = await file.arrayBuffer();
                              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                              await fetch(`https://askademic-ai.onrender.com/research/upload/${sessionId}`, {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: JSON.stringify({ filename: file.name, contentBase64: base64 })
                              });
                              await fetchAll();
                            } catch (err) {
                              console.error('Upload failed:', err);
                            } finally {
                              setUploading(false);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                        {uploading ? 'Uploading…' : 'Add PDF'}
                      </label>
                    </div>
                    {sources.map((source, index) => {
                      const domain = getDomain(source.url);
                      const summary = (source as { summary?: string }).summary || summarizeText(source.content || '');
                      return (
                        <div key={index} className="rounded-lg border border-gray-700 bg-gray-800/60 hover:bg-gray-800 transition-colors">
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <a href={source.url} target="_blank" rel="noopener noreferrer" className="block">
                                  <h3 className="text-white font-semibold truncate hover:text-indigo-300 transition-colors">
                                    {source.title || domain || 'Untitled Source'}
                                  </h3>
                                </a>
                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                                  {domain && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                      {domain}
                                    </span>
                                  )}
                                  {typeof source.relevance_score === 'number' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-900/30 text-indigo-300">
                                      Relevance: {Math.round(source.relevance_score * 100)}%
                                    </span>
                                  )}
                                  {source.source_type && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 capitalize">
                                      {source.source_type}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-xs text-indigo-400 hover:text-indigo-300"
                              >
                                Open ↗
                              </a>
                            </div>

                            {summary && (
                              <p className="mt-3 text-sm text-gray-300 leading-relaxed">
                                {summary}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'logs' && (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="text-sm text-gray-400 font-mono bg-gray-700 p-2 rounded">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
