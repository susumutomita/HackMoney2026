"use client";

import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ApiDocsPage() {
  const docsUrl = `${API_URL}/docs`;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex items-center justify-between p-6 border-b border-white/5">
        <Link href="/">
          <span className="text-2xl font-bold text-cyan-400">ZeroKey</span>
          <span className="text-gray-400"> Treasury</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/marketplace" className="text-gray-300 hover:text-white">
            Marketplace
          </Link>
          <Link href="/dashboard" className="text-gray-300 hover:text-white">
            Dashboard
          </Link>
          <Link href="/tutorial" className="text-gray-300 hover:text-white">
            Tutorial
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <h1 className="text-2xl font-bold">API Docs</h1>
        <p className="mt-2 text-sm text-gray-400">
          Swagger UI served by the backend. If it doesn’t load, open it directly:{" "}
          <a href={docsUrl} target="_blank" rel="noreferrer" className="text-cyan-300">
            {docsUrl}
          </a>
        </p>
      </div>

      <div className="px-6 pb-8">
        <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
          <iframe
            title="ZeroKey Treasury API Docs"
            src={docsUrl}
            className="w-full"
            style={{ height: "calc(100vh - 220px)" }}
          />
        </div>
      </div>
    </main>
  );
}
