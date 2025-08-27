"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';

interface SessionItem {
  id: string;
  createdAt: string;
  latestStatus: string;
}

export default function ChatStarterPage() {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep' | 'comprehensive'>('deep');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      router.push('/signin');
      return;
    }
    loadSessions();
  }, [router]);

  const getAuthHeaders = () => {
    const sessionToken = localStorage.getItem('sessionToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    };
  };

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('http://localhost:8080/research/sessions', { 
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else if (res.status === 401) {
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
        router.push('/signin');
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const startResearch = async () => {
    if (!query.trim()) {
      setError('Please enter a research query');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/research/initiate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query: query.trim(), depth })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to start research');
        setLoading(false);
        return;
      }

      const sessionId = data.sessionId;
      if (!sessionId) {
        setError('No sessionId returned');
        setLoading(false);
        return;
      }

      // Reload sessions and redirect
      await loadSessions();
      router.push(`/chat/${sessionId}`);
    } catch (e: any) {
      setError(e?.message || 'Network error');
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'pending':
      case 'processing': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Research Sessions</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">+ New</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loadingSessions ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">Loading sessions...</div>
                ) : sessions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No sessions yet</div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/chat/${session.id}`}
                        className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {session.id.slice(0, 8)}...
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatDate(session.createdAt)}
                            </p>
                          </div>
                          <div className={`ml-2 w-2 h-2 rounded-full ${getStatusColor(session.latestStatus)}`}></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Start a new research session</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter your research question. You'll be redirected to your session page.
              </p>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded mb-4 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Research Query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter your research question..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={4}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Research Depth
                  </label>
                  <select
                    value={depth}
                    onChange={(e) => setDepth(e.target.value as 'quick' | 'deep' | 'comprehensive')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating session…' : 'Create session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
