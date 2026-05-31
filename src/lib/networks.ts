import { defineChain } from "viem";

export const RESCUER_ADDRESSES: Record<string, `0x${string}`> = {
  base: "0xb0a587c9362e05e12bc199f9a45b48b97f5e44c1",
  ethereum: "0x4ca575acc61c907e4f49749884b2b7879e6789c0",
};

export const supportedNetworks = [
  {
    key: "base",
    chain: defineChain({
      id: 8453,
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://mainnet.base.org"] } },
      blockExplorers: { default: { name: "Basescan", url: "https://basescan.org" } },
    }),
    rescuerAddress: RESCUER_ADDRESSES.base,
  },
  {
    key: "ethereum",
    chain: defineChain({
      id: 1,
      name: "Ethereum",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["https://ethereum.publicnode.com"] } },
      blockExplorers: { default: { name: "Etherscan", url: "https://etherscan.io" } },
    }),
    rescuerAddress: RESCUER_ADDRESSES.ethereum,
  },
] as const;

export type NetworkKey = (typeof supportedNetworks)[number]["key"];
