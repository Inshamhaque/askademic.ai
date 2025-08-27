"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Logo from "../../components/Logo";
import ReactMarkdown from "react-markdown";

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
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null;
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    };
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`http://localhost:8080/research/sessions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else if (res.status === 401) {
        router.push("/signin");
      }
    } catch {}
  };

  const fetchAll = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError("");

      const [statusRes, reportRes, sourcesRes, logsRes] = await Promise.all([
        fetch(`http://localhost:8080/research/status/${sessionId}`, { headers: getAuthHeaders() }),
        fetch(`http://localhost:8080/research/report/${sessionId}`, { headers: getAuthHeaders() }),
        fetch(`http://localhost:8080/research/sources/${sessionId}`, { headers: getAuthHeaders() }),
        fetch(`http://localhost:8080/research/logs/${sessionId}`, { headers: getAuthHeaders() }),
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
    } catch (e: any) {
      setError(e?.message || "Failed to load session");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (!token) {
      router.push("/signin");
      return;
    }
    loadSessions();
  }, [router]);

  useEffect(() => {
    if (!sessionId) return;

    fetchAll();

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8080/research/status/${sessionId}`, { headers: getAuthHeaders() });
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
      } catch (_) {}
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId, router]);

  const handleSignOut = async () => {
    try {
      await fetch("http://localhost:8080/user/signout", { method: "POST", headers: getAuthHeaders() });
    } catch {}
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("user");
    router.push("/");
  };

  const isActive = (id: string) => id === sessionId;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <button onClick={handleSignOut} className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Sessions</h2>
              <Link href="/chat" className="text-xs text-indigo-400 hover:text-indigo-300">+ New</Link>
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-700">
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

        {/* Main content */}
        <section className="lg:col-span-3">
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-2 rounded mb-4 text-sm">{error}</div>
          )}

          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
            <div className="border-b border-gray-700">
              <nav className="flex space-x-8 px-6">
                <button onClick={() => setActiveTab("results")} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "results" ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"}`}>Results</button>
                <button onClick={() => setActiveTab("sources")} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "sources" ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"}`}>Sources</button>
                <button onClick={() => setActiveTab("logs")} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "logs" ? "border-indigo-500 text-indigo-400" : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"}`}>Logs</button>
              </nav>
            </div>

            <div className="p-6">
              {loading && <p className="text-gray-400">Loading…</p>}

              {!loading && activeTab === "results" && result && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-400">Status: {status}</div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-medium text-white mb-2">Research Report</h3>
                    <div className="max-h-96 overflow-y-auto prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-4">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold text-white mb-3">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-medium text-white mb-2">{children}</h3>,
                          p: ({ children }) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-gray-300">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
                          code: ({ children }) => <code className="bg-gray-800 text-indigo-300 px-1 py-0.5 rounded text-sm">{children}</code>,
                          pre: ({ children }) => <pre className="bg-gray-800 text-gray-300 p-3 rounded mb-3 overflow-x-auto">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-indigo-500 pl-4 text-gray-300 italic mb-3">{children}</blockquote>,
                          a: ({ children, href }) => <a href={href} className="text-indigo-400 hover:text-indigo-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                          table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="min-w-full border border-gray-600">{children}</table></div>,
                          th: ({ children }) => <th className="border border-gray-600 px-3 py-2 text-left text-white font-medium bg-gray-800">{children}</th>,
                          td: ({ children }) => <td className="border border-gray-600 px-3 py-2 text-gray-300">{children}</td>,
                        }}
                      >
                        {result.report || ""}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {!loading && activeTab === "sources" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-white">Sources ({sources.length})</h3>
                  {sources.map((s, i) => (
                    <div key={i} className="border border-gray-700 rounded-lg p-3">
                      <h4 className="font-medium text-sm text-white mb-1">{s.title}</h4>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 block mb-2">{s.url}</a>
                      <p className="text-xs text-gray-400 line-clamp-3">{s.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {!loading && activeTab === "logs" && (
                <div className="space-y-2">
                  <h3 className="font-medium text-white">Process Logs</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {logs.map((log, i) => (
                      <div key={i} className="text-xs text-gray-400 bg-gray-700 p-2 rounded">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
