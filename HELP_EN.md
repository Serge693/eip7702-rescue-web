# EIP-7702 Rescue Web — Help (English)

## What is this?

A browser tool that rescues ETH and ERC-20 tokens from a compromised wallet without giving the attacker any window to intercept. It uses EIP-7702, a new Ethereum standard that lets a regular wallet (EOA) temporarily act as a smart contract.

---

## Before you start

You will need:

| What | Why |
|------|-----|
| **Source private key** | The compromised wallet's private key |
| **Sponsor private key** | A clean wallet that pays gas — must have ≥ 0.005 ETH on the target network |
| **Destination address** | A safe address where funds will be sent |

> **The sponsor wallet must NOT be compromised.** Use a fresh wallet or a hardware wallet.

---

## Step-by-step guide

### Step 1 — Open the app

Go to the app in your browser. Connect your safe wallet via the **Connect Wallet** button (top right) — this auto-fills the Destination field. You can also type the destination manually.

---

### Step 2 — Fill in the Config form

**Source Private Key**
The private key of the compromised wallet. The app derives the address and shows it below the field so you can verify.

**Sponsor Private Key**
The private key of a wallet that will pay gas. It must have enough ETH on the selected network (at least 0.005 ETH is checked automatically).

**Destination Address**
Where all rescued funds will be sent. Double-check this address — funds cannot be recalled.

**Network**
Select the network where the compromised wallet holds funds. Currently supported: **Base**, **Ethereum**.

---

### Step 3 — Claim & Tokens (optional)

Expand this section if you need to claim tokens before rescuing, or rescue specific ERC-20 tokens.

**Claim Contract + Claim Calldata**

If you have unclaimed tokens on a reward platform (Layer3, Galxe, etc.):

1. Open the claim page
2. Connect the **compromised** wallet
3. Click the claim button
4. In MetaMask, open the **Hex** tab
5. Copy the hex data and note the **To** address
6. **Do NOT confirm** the MetaMask transaction
7. Paste into the app:
   - **Claim Contract** = the "To" address from MetaMask
   - **Claim Calldata** = the hex data

> Claim signatures expire. Complete the rescue immediately after copying.

**Claim Token**
The ERC-20 token address that will be received after the claim. The rescue contract will forward it to destination.

**Additional Rescue Tokens**
ERC-20 tokens already held by the source wallet. Paste addresses separated by commas:
```
0xTokenA,0xTokenB,0xTokenC
```

**Custom RPC URL**
Public RPCs (like `mainnet.base.org`) sometimes don't support transaction simulation. If you see "Simulation failed", paste a private RPC here:
- Alchemy: `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`
- Infura: `https://mainnet.infura.io/v3/YOUR_KEY`

---

### Step 4 — Dry Run (recommended first time)

Toggle **DRY RUN** before executing. This simulates the rescue and shows the estimated gas cost without sending any transactions. If the simulation passes, turn off Dry Run and execute for real.

---

### Step 5 — Review

Click **Review →**. Check every field carefully:

- Source address matches the compromised wallet
- Destination address is correct
- Network matches where the funds are
- Mode shows **LIVE** (or DRY RUN if testing)

---

### Step 6 — Execute

Click **Execute Rescue →**. The app will:

1. Check RPC connectivity
2. Verify source and sponsor balances
3. Verify the rescue contract is deployed
4. Sign EIP-7702 authorization (no transaction)
5. Send atomic transaction: delegate + rescue in one shot
6. Wait for confirmation
7. (If rescue tokens specified) Send a second tx to rescue ERC-20 tokens
8. Revoke the delegation — wallet restored to normal EOA
9. Show transaction links to block explorer

---

## After the rescue

- ✅ Funds are at the destination address
- ✅ The source wallet's delegation has been revoked
- ⚠️ **Stop using the compromised wallet.** The attacker still has the private key.
- ⚠️ Transfer any remaining assets from the sponsor wallet to a safe address if it's temporary.

---

## Troubleshooting

### "Simulation FAILED"

The public RPC doesn't support `eth_call` with `stateOverride`. Two options:

1. Add a private RPC in the **Custom RPC URL** field (Alchemy or Infura)
2. Or proceed — if you're confident the setup is correct, the real transaction may still succeed

### "Sponsor balance too low"

Top up the sponsor wallet with ETH on the correct network. At least 0.005 ETH is required to cover gas.

### "claim reverted with no reason"

The claim calldata signature has expired. Go back to the claim site, repeat steps 1–7 in the Claim section, and execute immediately.

### "RPC chain ID mismatch"

The custom RPC URL you entered is for a different network. Use the correct URL for the selected chain.

### Source wallet shows 0 balance but I have tokens

ETH balance can be zero while ERC-20 tokens exist. Add the token addresses to **Additional Rescue Tokens** and the rescue will still execute.

---

## FAQ

**Does the rescue contract hold my funds?**
No. It immediately forwards everything to the destination address in the same transaction.

**Can I reuse the rescue contract?**
Yes. The deployed contracts on Base and Ethereum handle unlimited rescues — one instance per network, no redeployment needed.

**What if the destination address is wrong?**
Funds cannot be recovered. Always double-check before executing.

**Is there a time limit?**
Only if you use claim calldata — those signatures expire (usually within minutes to hours). Everything else has no time limit.

**Can I rescue from multiple networks at once?**
The web UI does one network per rescue. For multi-network rescues, use the CLI tool.
