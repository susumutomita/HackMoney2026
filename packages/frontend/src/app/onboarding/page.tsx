"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { GUARD_ADDRESSES, isSafeAddress, createSetGuardTx } from "@/lib/safe";

type Step = 1 | 2 | 3 | 4;

interface AgentData {
  agentId: string;
  apiKey: string;
  name: string;
}

export default function OnboardingPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [step, setStep] = useState<Step>(1);
  
  // Allow debug step via URL param: ?step=2
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const debugStep = params.get("step");
    if (debugStep && ["1", "2", "3", "4"].includes(debugStep)) {
      setStep(parseInt(debugStep) as Step);
    }
  }, []);
  const [safeAddress, setSafeAddress] = useState("");
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [isCheckingSafe, setIsCheckingSafe] = useState(false);
  const [guardSetupPending, setGuardSetupPending] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [isRegisteringAgent, setIsRegisteringAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-advance when wallet connected
  useEffect(() => {
    if (isConnected && step === 1) {
      setStep(2);
    }
  }, [isConnected, step]);

  // Check if address is a Safe
  // For demo, we check Base Sepolia (84532) since that's where our Guard is deployed
  const checkSafeAddress = async () => {
    if (!safeAddress || safeAddress.length !== 42) return;
    
    setIsCheckingSafe(true);
    setIsSafe(null);
    setError(null);
    
    try {
      // Always check Base Sepolia for demo (where Guard is deployed)
      const checkChainId = 84532;
      const result = await isSafeAddress(safeAddress, checkChainId);
      setIsSafe(result);
      if (!result) {
        setError("This address is not a Safe wallet on Base Sepolia. Please create a Safe on Base Sepolia first.");
      }
    } catch {
      setIsSafe(false);
      setError("Failed to verify Safe address. Please check the address.");
    } finally {
      setIsCheckingSafe(false);
    }
  };

  // Setup Guard
  const setupGuard = async () => {
    if (!safeAddress) return;
    
    // For demo mode, use a placeholder address if wallet not connected
    const ownerAddr = address || "0x0000000000000000000000000000000000000000";
    
    setGuardSetupPending(true);
    setError(null);
    
    try {
      const guardAddress = GUARD_ADDRESSES[chainId] || GUARD_ADDRESSES[84532];
      // Create tx for reference (will be proposed via Safe App in production)
      await createSetGuardTx(safeAddress, guardAddress, ownerAddr, chainId);
      
      // Register in backend
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/guard/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safeAddress,
          chainId,
          ownerAddress: ownerAddr,
          guardContractAddress: guardAddress,
        }),
      });
      
      // For demo, we skip actual tx submission and move to next step
      // In production, this would open Safe App to propose the tx
      setStep(3);
    } catch {
      setError("Failed to setup guard. Please try again.");
    } finally {
      setGuardSetupPending(false);
    }
  };

  // Register Agent
  const registerAgent = async () => {
    if (!agentName || !safeAddress) return;
    
    // For demo mode, use a placeholder address if wallet not connected
    const ownerAddr = address || "0x0000000000000000000000000000000000000000";
    
    setIsRegisteringAgent(true);
    setError(null);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/agents/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName,
          safeAddress,
          chainId,
          ownerAddress: ownerAddr,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to register agent");
      }
      
      const data = await res.json();
      setAgentData(data);
      setStep(4);
    } catch {
      setError("Failed to register agent. Please try again.");
    } finally {
      setIsRegisteringAgent(false);
    }
  };

  const copyApiKey = () => {
    if (agentData?.apiKey && typeof window !== "undefined") {
      window.navigator.clipboard.writeText(agentData.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="font-semibold text-lg">ZeroKey</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Progress Steps */}
      <div className="pt-24 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                  step >= s 
                    ? "bg-cyan-500 text-white" 
                    : "bg-white/10 text-gray-400"
                }`}>
                  {step > s ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                {s < 4 && (
                  <div className={`w-16 sm:w-24 h-0.5 mx-2 transition-all ${
                    step > s ? "bg-cyan-500" : "bg-white/10"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-400 px-2">
            <span>Connect</span>
            <span>Safe</span>
            <span>Agent</span>
            <span>Done</span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 pb-20">
        <div className="max-w-lg mx-auto">
          {/* Step 1: Connect Wallet */}
          {step === 1 && (
            <div className="bg-[#12121a] rounded-2xl p-8 border border-white/5">
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-8">
                Connect your wallet to get started with ZeroKey.
              </p>
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            </div>
          )}

          {/* Step 2: Setup Safe */}
          {step === 2 && (
            <div className="bg-[#12121a] rounded-2xl p-8 border border-white/5">
              <h2 className="text-2xl font-bold mb-2">Setup Your Safe</h2>
              <p className="text-gray-400 mb-6">
                Enter your Safe multisig address to protect it with ZeroKey Guard.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Safe Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={safeAddress}
                    onChange={(e) => {
                      setSafeAddress(e.target.value);
                      setIsSafe(null);
                      setError(null);
                    }}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 font-mono text-sm"
                  />
                </div>
                
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
                
                {isSafe === true && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Valid Safe wallet detected
                  </div>
                )}
                
                <div className="flex gap-3">
                  {!isSafe && (
                    <button
                      onClick={checkSafeAddress}
                      disabled={!safeAddress || safeAddress.length !== 42 || isCheckingSafe}
                      className="flex-1 px-4 py-3 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCheckingSafe ? "Checking..." : "Verify Safe"}
                    </button>
                  )}
                  
                  {isSafe && (
                    <button
                      onClick={setupGuard}
                      disabled={guardSetupPending}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {guardSetupPending ? "Setting up..." : "Enable ZeroKey Guard"}
                    </button>
                  )}
                </div>
                
                <div className="pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500">
                    Don't have a Safe?{" "}
                    <a
                      href="https://app.safe.global/new-safe/create"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      Create one here →
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Register Agent */}
          {step === 3 && (
            <div className="bg-[#12121a] rounded-2xl p-8 border border-white/5">
              <h2 className="text-2xl font-bold mb-2">Register Your Agent</h2>
              <p className="text-gray-400 mb-6">
                Give your AI agent a name and get an API key to use ZeroKey services.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Agent Name</label>
                  <input
                    type="text"
                    placeholder="My AI Assistant"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div className="p-4 bg-black/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Connected Safe
                  </div>
                  <p className="font-mono text-sm truncate">{safeAddress}</p>
                </div>
                
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
                
                <button
                  onClick={registerAgent}
                  disabled={!agentName || isRegisteringAgent}
                  className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegisteringAgent ? "Registering..." : "Register Agent"}
                </button>
                
                <button
                  onClick={() => setStep(4)}
                  className="w-full px-4 py-3 text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div className="bg-[#12121a] rounded-2xl p-8 border border-white/5">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
                <p className="text-gray-400">
                  Your Safe is now protected by ZeroKey.
                </p>
              </div>
              
              {agentData && (
                <div className="mb-6 p-4 bg-black/30 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm mb-3">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Save your API key - it won't be shown again!
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Agent ID</span>
                      <p className="font-mono text-sm">{agentData.agentId}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">API Key</span>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 font-mono text-xs bg-black/50 p-2 rounded break-all">
                          {agentData.apiKey}
                        </code>
                        <button
                          onClick={copyApiKey}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                        >
                          {copied ? (
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="block w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-center rounded-lg hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/marketplace"
                  className="block w-full px-4 py-3 bg-white/5 text-white text-center rounded-lg hover:bg-white/10 transition-colors"
                >
                  Explore Marketplace
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
