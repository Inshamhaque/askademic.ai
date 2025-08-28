'use client'
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "./components/Logo";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem("user");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white flex flex-col">
      {/* Navbar */}
      <nav className="w-full flex justify-between items-center px-8 py-4 border-b border-gray-800">
        <Logo />
        <div className="flex gap-6"></div>
        {isLoggedIn ? (
          <button
            onClick={() => {
              router.push("/chat");
            }}
            className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition"
          >
            Go to Chat
          </button>
        ) : (
          <button
            onClick={() => {
              router.push("/signup");
            }}
            className="bg-indigo-600 hover:bg-indigo-500 hover:cursor-pointer  px-5 py-2 rounded-lg font-medium transition"
          >
            Get Started
          </button>
        )}
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl sm:text-6xl font-extrabold leading-tight"
        >
          Your <span className="text-indigo-500">AI Research Copilot</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-lg max-w-2xl text-gray-300"
        >
          Accelerate your research with an AI-powered agent that fetches, analyzes, and summarizes sources for you.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-10 flex gap-4"
        >
          <button className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold transition">
            Try Now
          </button>
          <button className="border border-gray-700 hover:border-indigo-400 px-6 py-3 rounded-xl font-semibold transition">
            Learn More
          </button>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-8 py-20 bg-gray-950">
        <h2 className="text-3xl font-bold text-center">Why Choose Copilot?</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: "Source Fetching",
              desc: "Pulls papers, articles, and reports instantly from multiple sources.",
            },
            {
              title: "Deep Analysis",
              desc: "Summarizes and evaluates sources with different levels of depth.",
            },
            {
              title: "Seamless Workflow",
              desc: "Integrates into your existing research flow with ease.",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="p-6 bg-gray-900 rounded-2xl shadow-lg border border-gray-800"
            >
              <h3 className="text-xl font-semibold text-indigo-400">{f.title}</h3>
              <p className="mt-3 text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Demo Video Section */}
      {/* <section id="demo" className="px-8 py-20 bg-gray-900 text-center">
        <h2 className="text-3xl font-bold">See It in Action</h2>
        <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
          Watch how ResearchCopilot helps researchers accelerate their workflow with intelligent source fetching, deep analysis, and seamless integration.
        </p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mt-10 max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-800"
        >
          <div className="aspect-video">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ" // replace with your actual demo video link
              title="ResearchCopilot Demo Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </motion.div>
      </section> */}

      {/* Footer */}
      <footer id="contact" className="py-8 border-t border-gray-800 text-center text-gray-500">
        © {new Date().getFullYear()} ResearchCopilot. All rights reserved.
      </footer>
    </div>
  );
}
