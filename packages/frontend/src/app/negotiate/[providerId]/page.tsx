"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import Link from "next/link";
import { erc20Abi, parseUnits } from "viem";
import { PayConfirmModal, PaymentStatusModal } from "@/components";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Provider {
  id: string;
  name: string;
  services: string[];
  pricePerUnit: string;
  unit: string;
  trustScore: number;
}

interface NegotiationMessage {
  type: "user" | "provider" | "system";
  content: string;
  timestamp: Date;
}

interface FirewallResult {
  decision: "APPROVED" | "WARNING" | "REJECTED";
  riskLevel: number;
  reason: string;
  warnings: string[];
}

export default function NegotiatePage() {
  const params = useParams();
  const providerId = params.providerId as string;
  const { address, isConnected } = useAccount();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [offerAmount, setOfferAmount] = useState("");
  const [negotiationStatus, setNegotiationStatus] = useState<string>("idle");
  const [firewallResult, setFirewallResult] = useState<FirewallResult | null>(null);
  const [payConfirmOpen, setPayConfirmOpen] = useState(false);
  const [payStatusOpen, setPayStatusOpen] = useState(false);
  const [payStatus, setPayStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [payError, setPayError] = useState<string | undefined>(undefined);
  const [payResultUrl, setPayResultUrl] = useState<string | undefined>(undefined);
  const [agreedPrice, setAgreedPrice] = useState<string | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  useEffect(() => {
    fetchProvider();
  }, [providerId]);

  async function fetchProvider() {
    try {
      const res = await fetch(`${API_URL}/api/a2a/provider/${providerId}`);
      const data = await res.json();
      if (data.success) {
        setProvider(data.provider);
        setOfferAmount(data.provider.pricePerUnit);
      }
    } catch {
      console.error("Failed to fetch provider");
    } finally {
      setLoading(false);
    }
  }

  async function startNegotiation() {
    if (!provider || !address) return;

    setNegotiationStatus("starting");
    addMessage("system", "Starting negotiation session...");

    try {
      const res = await fetch(`${API_URL}/api/a2a/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: address,
          providerId: provider.id,
          service: provider.services[0],
          initialOffer: offerAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionId(data.session.id);
        setNegotiationStatus("negotiating");
        addMessage("system", `Session started. Provider price: $${data.session.providerPrice}`);
        addMessage("user", `I offer $${offerAmount}`);
      }
    } catch {
      addMessage("system", "Failed to start negotiation");
      setNegotiationStatus("error");
    }
  }

  async function sendOffer(type: "offer" | "accept" | "reject") {
    if (!sessionId) return;

    try {
      const res = await fetch(`${API_URL}/api/a2a/negotiate/${sessionId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: offerAmount,
          type,
        }),
      });
      const data = await res.json();

      if (type === "accept") {
        addMessage("user", `I accept $${offerAmount}`);
        setNegotiationStatus("agreed");
        setAgreedPrice(offerAmount);
        addMessage("system", "Agreement reached! Running Firewall check...");
        await runFirewallCheck();
      } else if (type === "reject") {
        addMessage("user", "I reject this offer");
        setNegotiationStatus("rejected");
      } else if (data.response) {
        addMessage("user", `I offer $${offerAmount}`);
        if (data.response.type === "accept") {
          addMessage("provider", data.response.message);
          setNegotiationStatus("agreed");
          setAgreedPrice(offerAmount);
          addMessage("system", "Agreement reached! Running Firewall check...");
          await runFirewallCheck();
        } else if (data.response.type === "counter") {
          addMessage("provider", data.response.message);
          setOfferAmount(data.response.amount);
        }
      }
    } catch {
      addMessage("system", "Failed to send offer");
    }
  }

  async function runFirewallCheck() {
    if (!sessionId) return;

    try {
      const res = await fetch(`${API_URL}/api/firewall/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (data.success) {
        setFirewallResult(data.firewall);
        if (data.firewall.decision === "APPROVED") {
          addMessage("system", `✅ Firewall APPROVED: ${data.firewall.reason}`);
        } else if (data.firewall.decision === "WARNING") {
          addMessage("system", `⚠️ Firewall WARNING: ${data.firewall.reason}`);
        } else {
          addMessage("system", `❌ Firewall REJECTED: ${data.firewall.reason}`);
        }
      }
    } catch {
      addMessage("system", "Failed to run Firewall check");
    }
  }

  function addMessage(type: NegotiationMessage["type"], content: string) {
    setMessages((prev) => [...prev, { type, content, timestamp: new Date() }]);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Provider not found
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="flex items-center justify-between p-6 border-b border-white/5">
        <Link href="/">
          <span className="text-2xl font-bold text-cyan-400">ZeroKey</span>
          <span className="text-gray-400"> Treasury</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/marketplace" className="text-gray-300 hover:text-white">
            ← Back to Marketplace
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Provider Info */}
        <div className="bg-[#12121a] rounded-xl p-6 border border-white/5 mb-6">
          <h1 className="text-2xl font-bold mb-2">Negotiate with {provider.name}</h1>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>Services: {provider.services.join(", ")}</span>
            <span>•</span>
            <span>Trust Score: {provider.trustScore}/100</span>
            <span>•</span>
            <span>
              Base Price: ${provider.pricePerUnit}/{provider.unit}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div className="bg-[#12121a] rounded-xl p-8 border border-white/5 text-center">
            <p className="text-gray-400 mb-4">Connect your wallet to start negotiating</p>
            <ConnectButton />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Chat */}
            <div className="md:col-span-2 bg-[#12121a] rounded-xl border border-white/5">
              <div className="p-4 border-b border-white/5">
                <h2 className="font-semibold">Negotiation Chat</h2>
              </div>
              <div className="h-96 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      msg.type === "user"
                        ? "bg-cyan-500/20 ml-8"
                        : msg.type === "provider"
                          ? "bg-gray-700 mr-8"
                          : "bg-gray-700/50 text-sm text-gray-400"
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {msg.type === "user"
                        ? "You"
                        : msg.type === "provider"
                          ? provider.name
                          : "System"}
                    </div>
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {negotiationStatus === "idle" && (
                <div className="bg-[#12121a] rounded-xl p-4 border border-white/5">
                  <label className="block text-sm text-gray-400 mb-2">Your Offer (USDC)</label>
                  <input
                    type="text"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg mb-4"
                  />
                  <button
                    onClick={startNegotiation}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 py-3 rounded-lg font-medium"
                  >
                    Start Negotiation
                  </button>
                </div>
              )}

              {negotiationStatus === "negotiating" && (
                <div className="bg-[#12121a] rounded-xl p-4 border border-white/5">
                  <label className="block text-sm text-gray-400 mb-2">Counter Offer (USDC)</label>
                  <input
                    type="text"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded-lg mb-4"
                  />
                  <div className="space-y-2">
                    <button
                      onClick={() => sendOffer("offer")}
                      className="w-full bg-cyan-500 hover:bg-cyan-600 py-2 rounded-lg"
                    >
                      Send Offer
                    </button>
                    <button
                      onClick={() => sendOffer("accept")}
                      className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-lg"
                    >
                      Accept Current Price
                    </button>
                    <button
                      onClick={() => sendOffer("reject")}
                      className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg"
                    >
                      Reject & Exit
                    </button>
                  </div>
                </div>
              )}

              {firewallResult && (
                <div
                  className={`rounded-xl p-4 border ${
                    firewallResult.decision === "APPROVED"
                      ? "bg-green-900/30 border-green-700"
                      : firewallResult.decision === "WARNING"
                        ? "bg-yellow-900/30 border-yellow-700"
                        : "bg-red-950/60 border-red-600 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]"
                  }`}
                >
                  {firewallResult.decision === "REJECTED" ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-red-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 3 4 6v6c0 5 3.5 9 8 12 4.5-3 8-7 8-12V6l-8-3Z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.5 12.5 11 14l3.5-4"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs tracking-widest uppercase text-red-300/90">
                            Transfer Blocked
                          </div>
                          <h3 className="text-lg font-semibold text-white">
                            Security policy violation
                          </h3>
                          <p className="mt-1 text-sm text-red-100/90 whitespace-pre-line">
                            {firewallResult.reason}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-black/20 border border-red-500/20 p-3">
                        <div className="text-xs uppercase tracking-wide text-red-200/80 mb-1">
                          What you can do
                        </div>
                        <ul className="text-sm text-red-100/90 list-disc list-inside space-y-1">
                          <li>Choose a verified provider (known recipient).</li>
                          <li>Request manual approval for this recipient.</li>
                          <li>Start with a small test transaction after verification.</li>
                        </ul>
                      </div>

                      <details className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <summary className="cursor-pointer text-xs text-gray-300">
                          Technical details (for developers)
                        </summary>
                        <div className="mt-2 text-xs text-gray-400 space-y-1">
                          <div>
                            decision: <span className="text-gray-200">REJECTED</span>
                          </div>
                          {firewallResult.warnings.length > 0 && (
                            <div>
                              warnings:
                              <ul className="list-disc list-inside">
                                {firewallResult.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-semibold mb-2">
                        {firewallResult.decision === "APPROVED"
                          ? "✅ Firewall APPROVED"
                          : "⚠️ Firewall WARNING"}
                      </h3>

                      <p className="text-sm text-gray-200 mb-3">{firewallResult.reason}</p>

                      {firewallResult.warnings.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs uppercase tracking-wide text-yellow-200/80 mb-1">
                            Warnings
                          </div>
                          <ul className="text-sm text-yellow-200 list-disc list-inside">
                            {firewallResult.warnings.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="text-xs uppercase tracking-wide text-gray-300/80 mb-1">
                        Next step
                      </div>
                      <div className="text-sm text-gray-200">
                        {firewallResult.decision === "APPROVED" ? (
                          <span>
                            Proceed to payment. You can still double-check the provider and amount.
                          </span>
                        ) : (
                          <span>
                            We recommend proceeding only after verifying the provider identity and
                            starting with a small test amount.
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {negotiationStatus === "agreed" && (
                <div className="space-y-2">
                  <button
                    className={`w-full py-3 rounded-lg font-medium ${
                      firewallResult?.decision === "APPROVED"
                        ? "bg-cyan-500 hover:bg-cyan-600"
                        : "bg-gray-700 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={firewallResult?.decision !== "APPROVED"}
                    title={
                      firewallResult?.decision === "APPROVED"
                        ? "Ready to pay"
                        : "Payment is only enabled after Firewall APPROVED"
                    }
                    onClick={() => setPayConfirmOpen(true)}
                  >
                    💳 Pay ${agreedPrice} USDC
                  </button>

                  <PayConfirmModal
                    open={payConfirmOpen}
                    onClose={() => setPayConfirmOpen(false)}
                    onConfirm={async () => {
                      setPayConfirmOpen(false);

                      if (!walletClient || !publicClient) {
                        setPayStatus("failed");
                        setPayError("Wallet not connected");
                        setPayStatusOpen(true);
                        return;
                      }

                      const amountUsdc = agreedPrice ?? "0.03";

                      setPayError(undefined);
                      setPayResultUrl(undefined);
                      setPayStatus("processing");
                      setPayStatusOpen(true);
                      addMessage("system", "Processing payment…");

                      try {
                        // Request payment info (x402-style 402 response)
                        const req = await fetch(`${API_URL}/api/pay/request`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ amountUsdc, serviceId: providerId }),
                        });

                        const data = await req.json();
                        const payment = data.payment as {
                          recipient: `0x${string}`;
                          token: `0x${string}`;
                          chainId: number;
                          amountUsdc: string;
                        };

                        if (!payment?.recipient || !payment?.token) {
                          throw new Error("Payment request failed");
                        }

                        // Send USDC transfer via wallet
                        const value = parseUnits(payment.amountUsdc, 6);
                        const txHash = await walletClient.writeContract({
                          address: payment.token,
                          abi: erc20Abi,
                          functionName: "transfer",
                          args: [payment.recipient, value],
                        });

                        await publicClient.waitForTransactionReceipt({ hash: txHash });

                        // Submit txHash for verification
                        const submit = await fetch(`${API_URL}/api/pay/submit`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            txHash,
                            expectedAmountUsdc: payment.amountUsdc,
                            providerId,
                            firewallDecision: firewallResult?.decision ?? "REJECTED",
                            firewallReason: firewallResult?.reason ?? "Firewall not approved",
                          }),
                        });

                        const submitJson = await submit.json();
                        if (!submit.ok || !submitJson.success) {
                          throw new Error(submitJson.reason ?? "Payment verification failed");
                        }

                        const resultUrl = submitJson.result?.url as string | undefined;
                        if (resultUrl) {
                          setPayResultUrl(`${API_URL}${resultUrl}`);
                        }

                        setPayStatus("success");
                        addMessage("system", "✅ Payment successful.");
                      } catch (e) {
                        setPayStatus("failed");
                        setPayError(e instanceof Error ? e.message : "Unknown error");
                        addMessage("system", "⛔ Payment failed.");
                      }
                    }}
                    confirmDisabled={firewallResult?.decision !== "APPROVED"}
                    confirmText={`Confirm & Pay $${agreedPrice} USDC`}
                    amountLabel={`$${agreedPrice} USDC`}
                    recipientLabel={
                      provider?.name ? `${provider.name} (${provider.id})` : providerId
                    }
                    chainLabel="Base Sepolia"
                    firewallSummary={
                      firewallResult
                        ? `${firewallResult.decision}: ${firewallResult.reason}`
                        : "Firewall result not available"
                    }
                  />

                  <PaymentStatusModal
                    open={payStatusOpen}
                    status={payStatus}
                    amountLabel={`$${agreedPrice} USDC`}
                    recipientLabel={provider?.name ? provider.name : providerId}
                    errorMessage={payError}
                    resultUrl={payResultUrl}
                    onClose={() => {
                      setPayStatusOpen(false);
                      setPayStatus("idle");
                      setPayError(undefined);
                      setPayResultUrl(undefined);
                    }}
                    onRetry={() => {
                      setPayStatus("idle");
                      setPayError(undefined);
                      setPayStatusOpen(false);
                      setPayConfirmOpen(true);
                    }}
                  />

                  {firewallResult?.decision !== "APPROVED" && (
                    <div className="text-xs text-gray-400">
                      Pay is disabled until the Firewall returns{" "}
                      <span className="text-green-300">APPROVED</span>.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
