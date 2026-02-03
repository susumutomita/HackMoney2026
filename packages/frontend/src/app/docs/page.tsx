"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    SwaggerUIBundle: {
      (config: unknown): void;
      presets: {
        apis: unknown;
      };
    };
  }
}

export default function ApiDocsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const initSwagger = () => {
      if (window.SwaggerUIBundle) {
        window.SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          presets: [window.SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
        });
        initialized.current = true;
      }
    };

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js";
    script.onload = initSwagger;
    document.body.appendChild(script);

    return () => {
      // Cleanup
    };
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <nav className="flex items-center justify-between p-6 border-b bg-[#0a0a0f]">
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

      <div id="swagger-ui" className="p-4" />
    </main>
  );
}
