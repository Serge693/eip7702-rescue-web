"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "EIP-7702 Rescue Tool",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [mainnet, base],
  ssr: true,
});
