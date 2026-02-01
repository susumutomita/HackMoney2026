import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia, optimism, optimismSepolia, sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ZeroKey Treasury",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [base, baseSepolia, optimism, optimismSepolia, sepolia],
  // NOTE: Setting ssr=true can cause server-side evaluation paths that touch browser-only APIs
  // (e.g. indexedDB) depending on connector/storage internals.
  // For this hack/demo, keep it client-only to avoid runtime issues.
  ssr: false,
});
