import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Navigation */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-500">Askademic</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/signin"
                className="text-gray-300 hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-md transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
              <span className="block">AI-Powered</span>
              <span className="block text-indigo-200">Academic Research</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-indigo-100 sm:text-xl">
              Transform your research process with intelligent AI that finds, analyzes, and synthesizes information from multiple sources to deliver comprehensive academic insights.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-center gap-3">
              <Link
                href="/signup"
                className="px-8 py-3 bg-white text-indigo-700 font-medium rounded-md shadow hover:bg-gray-100 transition"
              >
                Start Researching
              </Link>
              <Link
                href="/signin"
                className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-md shadow hover:bg-indigo-700 transition"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-400 font-semibold tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Everything you need for academic research
            </p>
            <p className="mt-4 max-w-2xl text-lg text-gray-400 lg:mx-auto">
              Our AI-powered platform combines advanced search, intelligent analysis, and comprehensive reporting to revolutionize your research workflow.
            </p>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-2">
            {[
              {
                title: 'Intelligent Search',
                desc: 'Advanced web search that finds the most relevant and credible sources for your research topic.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                ),
              },
              {
                title: 'AI Analysis',
                desc: 'Deep analysis of sources with key findings, confidence scores, and actionable insights.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                ),
              },
              {
                title: 'Comprehensive Reports',
                desc: 'Generate detailed research reports with executive summaries, key findings, and recommendations.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                ),
              },
              {
                title: 'Real-time Processing',
                desc: 'Get results in minutes, not hours. Our AI processes information quickly and efficiently.',
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                ),
              },
            ].map((feature, idx) => (
              <div key={idx} className="relative pl-16">
                <div className="absolute left-0 top-0 flex items-center justify-center h-12 w-12 rounded-md bg-indigo-600 text-white">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <p className="text-lg font-medium text-white">{feature.title}</p>
                <p className="mt-2 text-base text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-indigo-800 to-purple-800">
        <div className="max-w-2xl mx-auto text-center py-16 px-6">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to start your research?</span>
            <span className="block">Join Askademic today.</span>
          </h2>
          <p className="mt-4 text-lg text-indigo-200">
            Transform your academic research with AI-powered insights and comprehensive analysis.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-700 rounded-md font-medium shadow hover:bg-gray-100 transition"
          >
            Get started for free
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto py-8 px-4 flex flex-col md:flex-row justify-between items-center text-gray-400">
          <p>&copy; 2024 Askademic. All rights reserved.</p>
          <p className="mt-2 md:mt-0">AI-powered academic research platform</p>
        </div>
      </footer>
    </div>
  );
}
