"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-indigo-600">Askademic</h1>
            <button onClick={handleSignOut} className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Sessions</h2>
              <Link href="/chat" className="text-xs text-indigo-600 hover:text-indigo-500">+ New</Link>
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y">
              {sessions.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No sessions yet</div>
              ) : (
                sessions.map(s => (
                  <Link key={s.id} href={`/chat/${s.id}`} className={`block p-4 hover:bg-gray-50 ${isActive(s.id) ? 'bg-indigo-50' : ''}`}>
                    <div className="text-sm font-medium text-gray-900 truncate">{s.id}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${s.latestStatus === 'completed' ? 'bg-green-500' : s.latestStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                      <span className="capitalize">{s.latestStatus}</span>
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm">{error}</div>
          )}

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b">
              <nav className="flex space-x-8 px-6">
                <button onClick={() => setActiveTab("results")} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "results" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>Results</button>
                <button onClick={() => setActiveTab("sources")} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "sources" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>Sources</button>
                <button onClick={() => setActiveTab("logs")} className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "logs" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>Logs</button>
              </nav>
            </div>

            <div className="p-6">
              {loading && <p className="text-gray-500">Loading…</p>}

              {!loading && activeTab === "results" && result && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">Status: {status}</div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Research Report</h3>
                    <div className="prose prose-sm max-h-96 overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: (result.report || "").replace(/\n/g, "<br>") }} />
                    </div>
                  </div>
                </div>
              )}

              {!loading && activeTab === "sources" && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Sources ({sources.length})</h3>
                  {sources.map((s, i) => (
                    <div key={i} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm text-gray-900 mb-1">{s.title}</h4>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-500 block mb-2">{s.url}</a>
                      <p className="text-xs text-gray-600 line-clamp-3">{s.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {!loading && activeTab === "logs" && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Process Logs</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {logs.map((log, i) => (
                      <div key={i} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">{log}</div>
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
