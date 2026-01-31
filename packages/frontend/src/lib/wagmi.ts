import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia, optimism, optimismSepolia, sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "ZeroKey Treasury",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [base, baseSepolia, optimism, optimismSepolia, sepolia],
  ssr: true,
});
