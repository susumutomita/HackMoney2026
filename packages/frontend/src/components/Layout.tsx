"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-lg hidden sm:block">ZeroKey</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/marketplace" active={pathname === "/marketplace"}>
                Marketplace
              </NavLink>
              <NavLink href="/dashboard" active={pathname === "/dashboard"}>
                Dashboard
              </NavLink>
              <NavLink href="/tutorial" active={pathname === "/tutorial"}>
                Docs
              </NavLink>
            </div>

            <div className="hidden sm:block">
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, mounted }) => {
                  const connected = mounted && account && chain;
                  return (
                    <button
                      onClick={openConnectModal}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        connected
                          ? "bg-white/5 text-white hover:bg-white/10"
                          : "bg-white text-black hover:bg-white/90"
                      }`}
                    >
                      {connected ? account.displayName : "Connect"}
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
        active ? "text-white bg-white/5" : "text-gray-400 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </Link>
  );
}
