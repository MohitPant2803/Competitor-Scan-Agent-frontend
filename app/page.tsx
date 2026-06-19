"use client";

import React, { useState, useEffect, useRef } from "react";
import { BACKEND_URL, pingBackend } from "../lib/api";

interface StepProgress {
  step: string;
  status: "idle" | "pending" | "complete" | "failed";
  label: string;
  detail?: string;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [steps, setSteps] = useState<StepProgress[]>([
    { step: "scraping", status: "idle", label: "Website scraping & extraction" },
    { step: "pricing", status: "idle", label: "Pricing structure parsing" },
    { step: "seo", status: "idle", label: "SEO & performance scoring" },
    { step: "social", status: "idle", label: "Social media & community auditing" },
    { step: "content", status: "idle", label: "Content & editorial strategy analysis" },
    { step: "swot", status: "idle", label: "SWOT matrix synthesis" },
    { step: "pdf", status: "idle", label: "PDF report construction" }
  ]);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const resetState = () => {
    setUrl("");
    setAnalyzing(false);
    setCurrentUrl("");
    setIsWarmingUp(false);
    setDownloadUrl("");
    setErrorMessage("");
    setSteps([
      { step: "scraping", status: "idle", label: "Website scraping & extraction" },
      { step: "pricing", status: "idle", label: "Pricing structure parsing" },
      { step: "seo", status: "idle", label: "SEO & performance scoring" },
      { step: "social", status: "idle", label: "Social media & community auditing" },
      { step: "content", status: "idle", label: "Content & editorial strategy analysis" },
      { step: "swot", status: "idle", label: "SWOT matrix synthesis" },
      { step: "pdf", status: "idle", label: "PDF report construction" }
    ]);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    // Normalize URL
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    setAnalyzing(true);
    setCurrentUrl(targetUrl);
    setErrorMessage("");
    setDownloadUrl("");

    // Start a timer to check if backend responds quickly. If it doesn't within 3.5 seconds, it's likely warming up from Render's sleep mode.
    const warmUpTimeout = setTimeout(() => {
      setIsWarmingUp(true);
    }, 3500);

    try {
      // Check if backend is alive first
      const isAlive = await pingBackend();
      clearTimeout(warmUpTimeout);
      setIsWarmingUp(false);

      if (!isAlive) {
        // Continue anyway, but warn
        console.warn("Backend health check failed. Attempting SSE connection regardless...");
      }

      // Establish EventSource connection
      const sseUrl = `${BACKEND_URL}/analyze?url=${encodeURIComponent(targetUrl)}`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      // Reset steps statuses to pending for the first one
      setSteps(prev =>
        prev.map((s, idx) => ({
          ...s,
          status: idx === 0 ? "pending" : "idle",
          detail: undefined
        }))
      );

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.step) {
            setSteps(prev =>
              prev.map(stepItem => {
                if (stepItem.step === data.step) {
                  return {
                    ...stepItem,
                    status: data.status,
                    detail: data.detail || stepItem.detail
                  };
                }
                // Auto-trigger pending status on the next step if this one just completed
                const curIdx = prev.findIndex(s => s.step === data.step);
                const itemIdx = prev.findIndex(s => s.step === stepItem.step);
                if (data.status === "complete" && itemIdx === curIdx + 1 && stepItem.status === "idle") {
                  return { ...stepItem, status: "pending" };
                }
                return stepItem;
              })
            );

            if (data.step === "pdf" && data.status === "complete" && data.downloadUrl) {
              setDownloadUrl(`${BACKEND_URL}${data.downloadUrl}`);
              es.close();
            }
          }
        } catch (err) {
          console.error("Error parsing SSE event:", err);
        }
      };

      es.addEventListener("end", () => {
        console.log("SSE stream closed by server.");
        es.close();
      });

      es.onerror = (err) => {
        console.error("SSE connection error:", err);
        setErrorMessage("Lost connection to analysis server. Please check your URL and try again.");
        es.close();
      };

    } catch (err) {
      clearTimeout(warmUpTimeout);
      setIsWarmingUp(false);
      setErrorMessage("Failed to connect to the backend server. Make sure the backend is running.");
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            CompetitorScan
          </span>
        </div>
        <div className="text-xs text-slate-500 font-mono">v1.0 (Render + Vercel)</div>
      </header>

      {/* Main Panel */}
      <div className="flex-grow flex items-center justify-center py-12 px-4 md:px-8">
        <div className="w-full max-w-2xl bg-slate-900/40 border border-slate-900 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-2xl">
          
          {!analyzing ? (
            /* STATE 1: INPUT SCREEN */
            <div className="text-center space-y-8">
              <div className="space-y-4">
                <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  AI-Powered Competitor Intel
                </span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Know everything about your competitors in 60 seconds
                </h1>
                <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto">
                  Paste their website URL. Our automated research agent scans their pages, SEO, social presence, and synthesizes a full SWOT report.
                </p>
              </div>

              <form onSubmit={handleAnalyze} className="space-y-4 max-w-lg mx-auto">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="Enter competitor website (e.g. competitor.com)"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-6 pr-32 py-4 bg-slate-950/80 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-200 placeholder-slate-500 transition-all font-medium text-sm"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    Analyze
                  </button>
                </div>
              </form>

              {/* Specs Grid */}
              <div className="pt-6 border-t border-slate-900/60">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-6">
                  What we analyze instantly
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "Website", svg: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
                    { label: "Pricing", svg: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                    { label: "SEO", svg: "M13 10V3L4 14h7v7l9-11h-7z" },
                    { label: "Social Media", svg: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
                    { label: "SWOT Report", svg: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/20 border border-slate-900/50 hover:border-slate-800 transition-all">
                      <svg className="w-5 h-5 text-blue-500/80 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={item.svg} />
                      </svg>
                      <span className="text-xs font-semibold text-slate-300">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* STATE 2: ANALYSIS SCREEN */
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-900">
                <div>
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-widest block mb-1">
                    Analyzing URL
                  </span>
                  <h2 className="text-lg md:text-xl font-bold text-slate-100 truncate max-w-md">
                    {currentUrl}
                  </h2>
                </div>
                {!downloadUrl && !errorMessage && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                    Running Scan
                  </div>
                )}
              </div>

              {/* Warming up indicator */}
              {isWarmingUp && !downloadUrl && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-400 text-xs md:text-sm animate-pulse">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <span className="font-bold">Warming up analysis engine...</span>
                    <p className="text-amber-500/80 mt-0.5">Render servers spin down after 15 minutes of inactivity. Waking it up may take up to 45 seconds.</p>
                  </div>
                </div>
              )}

              {/* Progress Steps */}
              <div className="space-y-4">
                {steps.map((stepItem, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                      stepItem.status === "pending"
                        ? "bg-blue-500/5 border-blue-500/30 shadow-md shadow-blue-500/5"
                        : stepItem.status === "complete"
                        ? "bg-slate-900/30 border-slate-900"
                        : stepItem.status === "failed"
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-transparent border-transparent opacity-40"
                    }`}
                  >
                    {/* Status Circle */}
                    <div className="mt-0.5">
                      {stepItem.status === "pending" && (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {stepItem.status === "complete" && (
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {stepItem.status === "failed" && (
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {stepItem.status === "idle" && (
                        <div className="w-5 h-5 rounded-full border border-slate-800 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <p className={`text-sm font-semibold ${stepItem.status === "pending" ? "text-blue-400" : stepItem.status === "failed" ? "text-red-400" : "text-slate-200"}`}>
                        {stepItem.label}
                      </p>
                      {stepItem.detail && (
                        <span className="text-xs text-slate-500 font-medium block">
                          {stepItem.detail}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Error Box */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 text-xs md:text-sm">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="font-bold">Analysis Error</span>
                    <p className="text-red-500/80 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Complete State Actions */}
              {downloadUrl && (
                <div className="pt-6 border-t border-slate-900 flex flex-col md:flex-row gap-4">
                  <a
                    href={downloadUrl}
                    download
                    className="flex-grow flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl active:scale-95 transition-all shadow-xl shadow-blue-500/20"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF Report
                  </a>
                  <button
                    onClick={resetState}
                    className="px-6 py-4 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-300 font-bold rounded-2xl transition-all active:scale-95 text-sm"
                  >
                    Analyze Another Competitor
                  </button>
                </div>
              )}

              {errorMessage && (
                <div className="pt-6 border-t border-slate-900 text-center">
                  <button
                    onClick={resetState}
                    className="px-6 py-3 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-300 font-bold rounded-2xl transition-all active:scale-95 text-xs"
                  >
                    Return to Home
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-950 bg-slate-950 py-6 px-6 text-center text-xs text-slate-600 font-medium">
        &copy; {new Date().getFullYear()} CompetitorScan. All rights reserved. Created with Next.js 14 and Express.
      </footer>
    </main>
  );
}
