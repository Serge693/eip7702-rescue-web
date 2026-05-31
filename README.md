# EIP-7702 Rescue Web

Browser-based tool for rescuing tokens and native currency from a compromised wallet using [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) delegation — atomically, with no front-run window.

> **CLI version:** [eip7702-rescue](https://github.com/Serge693/eip7702-rescue) — for scripted / automated rescues

---

## How it works

EIP-7702 lets an EOA (regular wallet) temporarily delegate execution to a smart contract. This tool uses that mechanism to:

1. **Sign** — source wallet signs an EIP-7702 authorization (no transaction, no gas)
2. **Delegate + Rescue** — sponsor sends one atomic transaction: delegates the source wallet to the rescue contract, which immediately forwards all ETH and tokens to your safe destination
3. **Revoke** — delegation is cleared, source wallet is restored to a normal EOA

```
Sponsor wallet
    │
    ▼  EIP-7702 tx (authorizationList + calldata)
Source wallet ──delegate──► Rescue Contract
                                  │
                                  ├─ call claimContract (Layer3, Galxe...)
                                  ├─ transfer ERC-20 tokens → destination
                                  └─ transfer ETH → destination
```

Because delegation and rescue happen in **one transaction**, sweeper bots have zero window to front-run.

---

## Stack

- **Next.js 14** (App Router)
- **viem** — EIP-7702 signing, transaction building
- **wagmi + RainbowKit** — wallet connection (for destination address)
- **Tailwind CSS v4**
- Pure browser execution — no backend, no API keys required

---

## Deployed Rescue Contracts

| Network  | Chain ID | Rescuer Address                              |
|----------|----------|----------------------------------------------|
| Base     | 8453     | `0xb0a587c9362e05e12bc199f9a45b48b97f5e44c1` |
| Ethereum | 1        | `0x4ca575acc61c907e4f49749884b2b7879e6789c0` |

No constructor args. One deployed instance handles any number of rescues. Deploy on additional networks using the CLI tool.

---

## Quick Start

```bash
git clone https://github.com/Serge693/eip7702-rescue-web
cd eip7702-rescue-web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: WalletConnect

For wallet connection via RainbowKit, create `.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

Get a free project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com). Without it the app still works — wallet connection is only used to auto-fill the destination address.

---

## Adding Networks

Open `src/lib/networks.ts` and add to `supportedNetworks`:

```ts
{
  key: "arbitrum",
  chain: defineChain({
    id: 42161,
    name: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: ["https://arb1.arbitrum.io/rpc"] } },
    blockExplorers: { default: { name: "Arbiscan", url: "https://arbiscan.io" } },
  }),
  rescuerAddress: "0x...", // deploy with CLI first
},
```

Deploy the rescue contract on a new network using the CLI:

```bash
npx tsx src/index.ts deploy arbitrum
```

**Networks confirmed to support EIP-7702:** Ethereum, Base, Arbitrum One, Optimism, Ink, Unichain.

**Networks that do NOT support EIP-7702:** zkSync Era and most pre-Pectra L2s.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx        Root layout, providers
│   ├── page.tsx          Main UI — all steps, i18n (EN/RU)
│   └── globals.css       Design system, pure CSS
├── components/
│   └── Providers.tsx     wagmi + RainbowKit providers
└── lib/
    ├── networks.ts       Network definitions + rescuer addresses
    ├── rescue.ts         Core rescue logic (ported from CLI)
    └── wagmi.ts          wagmi config
```

---

## Security

- ✅ Private keys never leave the browser — no server, no logging
- ✅ Rescue is atomic — delegate and rescue in one transaction
- ✅ Rescue contract holds no funds — everything forwards immediately
- ✅ Delegation is revoked after rescue — EOA fully restored
- ⚠️ After rescue, **never use the compromised wallet again** — the attacker still has the private key
- ⚠️ Do not run this on untrusted networks or devices

---

## Troubleshooting

**Simulation failed**
→ Use a private RPC (Alchemy/Infura) in the Custom RPC field. Public RPCs often don't support `stateOverride`.

**claim reverted with no reason**
→ The CLAIM_DATA signature expired. Re-fetch fresh calldata from MetaMask.

**Sponsor balance too low**
→ Top up the sponsor wallet with at least 0.005 ETH on the target network.

**RPC chain ID mismatch**
→ Set a correct Custom RPC URL for the selected network.

---

## License

MIT
