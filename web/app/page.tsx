'use client'
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "./components/Logo";
import { useRouter } from "next/navigation";


export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  useEffect(()=>{
    const token = localStorage.getItem("user");
    if(token){
      setIsLoggedIn(true);
    }
  },[])
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white flex flex-col">
      {/* Navbar */}
      <nav className="w-full flex justify-between items-center px-8 py-4 border-b border-gray-800">
        <Logo />
        <div className="flex gap-6">
          <a href="#features" className="hover:text-indigo-400">Features</a>
          {/* <a href="#pricing" className="hover:text-indigo-400">Pricing</a> */}
          <a href="#contact" className="hover:text-indigo-400">Contact</a>
        </div>
        {isLoggedIn?<button onClick={()=>{
          router.push("/chat");
        }} className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition">
          Go to Chat
        </button>:<button onClick={()=>{
          router.push("/signup");
        }} className="bg-indigo-600 hover:bg-indigo-500 hover:cursor-pointer  px-5 py-2 rounded-lg font-medium transition">
          Get Started
        </button>}
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

      {/* Pricing Section
      <section id="pricing" className="px-8 py-20 bg-gray-900">
        <h2 className="text-3xl font-bold text-center">Simple Pricing</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { plan: "Free", price: "$0", features: ["5 queries/day", "Basic summaries"] },
            { plan: "Pro", price: "$19/mo", features: ["Unlimited queries", "Advanced analysis", "Priority support"] },
            { plan: "Enterprise", price: "Custom", features: ["Team features", "Custom integrations", "Dedicated support"] },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="p-8 bg-gray-950 rounded-2xl border border-gray-800 shadow-lg flex flex-col items-center"
            >
              <h3 className="text-xl font-semibold">{p.plan}</h3>
              <p className="text-3xl font-bold mt-2 text-indigo-500">{p.price}</p>
              <ul className="mt-6 space-y-2 text-gray-400">
                {p.features.map((f, j) => (
                  <li key={j}>✓ {f}</li>
                ))}
              </ul>
              <button className="mt-8 bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg font-medium transition">
                Choose {p.plan}
              </button>
            </motion.div>
          ))}
        </div>
      </section> */}

      {/* Footer */}
      <footer id="contact" className="py-8 border-t border-gray-800 text-center text-gray-500">
        © {new Date().getFullYear()} ResearchCopilot. All rights reserved.
      </footer>
    </div>
  );
}
