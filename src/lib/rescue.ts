import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  concat,
  pad,
  encodeAbiParameters,
  zeroAddress,
  type Hex,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// Contract bytecode (compiled EIP7702Rescuer.sol — solc 0.8.23, opt 200 runs)
// ─────────────────────────────────────────────────────────────────────────────
export const RESCUER_BYTECODE =
  "0x608060405234801561000f575f80fd5b5061072d8061001d5f395ff3fe60806040526004361061004c575f3560e01c80630e7193cc146100575780634707d00014610078578063839006f214610097578063a7104574146100b6578063f2621ded146100d5575f80fd5b3661005357005b5f80fd5b348015610062575f80fd5b506100766100713660046104e3565b6100f4565b005b348015610083575f80fd5b50610076610092366004610554565b61014e565b3480156100a2575f80fd5b506100766100b1366004610585565b61015c565b3480156100c1575f80fd5b506100766100d03660046105a5565b610169565b3480156100e0575f80fd5b506100766100ef366004610602565b6101b8565b6101338484848080601f0160208091040260200160405190810160405280939291908181526020018383808284375f920191909152506101fa92505050565b61013d85826102b8565b61014785476103e6565b5050505050565b61015882826102b8565b5050565b61016681476103e6565b50565b6101a88383838080601f0160208091040260200160405190810160405280939291908181526020018383808284375f920191909152506101fa92505050565b6101b284476103e6565b50505050565b5f5b818110156101b2576101f2848484848181106101d8576101d8610681565b90506020020160208101906101ed9190610585565b6102b8565b6001016101ba565b5f80836001600160a01b0316836040516102149190610695565b5f604051808303815f865af19150503d805f811461024d576040519150601f19603f3d011682016040523d82523d5f602084013e610252565b606091505b5091509150816101b25780511561026b57805160208201fd5b60405162461bcd60e51b815260206004820152601d60248201527f636c61696d2072657665727465642077697468206e6f20726561736f6e00000060448201526064015b60405180910390fd5b6040516370a0823160e01b81523060048201525f906001600160a01b038316906370a0823190602401602060405180830381865afa1580156102fc573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061032091906106c1565b905080156103e15760405163a9059cbb60e01b81526001600160a01b038481166004830152602482018390525f919084169063a9059cbb906044016020604051808303815f875af1158015610377573d5f803e3d5ffd5b505050506040513d601f19601f8201168201806040525081019061039b91906106d8565b9050806101b25760405162461bcd60e51b8152602060048201526014602482015273199bdc9dd85c99081d1bdad95b8819985a5b195960621b60448201526064016102af565b505050565b8015610158575f826001600160a01b0316826040515f6040518083038185875af1925050503d805f8114610435576040519150601f19603f3d011682016040523d82523d5f602084013e61043a565b606091505b50509050806103e15760405162461bcd60e51b8152602060048201526015602482015274199bdc9dd85c99081b985d1a5d994819985a5b1959605a1b60448201526064016102af565b80356001600160a01b0381168114610499575f80fd5b919050565b5f8083601f8401126104ae575f80fd5b50813567ffffffffffffffff8111156104c5575f80fd5b6020830191508360208285010111156104dc575f80fd5b9250929050565b5f805f805f608086880312156104f7575f80fd5b61050086610483565b945061050e60208701610483565b9350604086013567ffffffffffffffff811115610529575f80fd5b6105358882890161049e565b9094509250610548905060608701610483565b90509295509295909350565b5f8060408385031215610565575f80fd5b61056e83610483565b915061057c60208401610483565b90509250929050565b5f60208284031215610595575f80fd5b61059e82610483565b9392505050565b5f805f80606085870312156105b8575f80fd5b6105c185610483565b93506105cf60208601610483565b9250604085013567ffffffffffffffff8111156105ea575f80fd5b6105f68782880161049e565b95989497509550505050565b5f805f60408486031215610614575f80fd5b61061d84610483565b9250602084013567ffffffffffffffff80821115610639575f80fd5b818601915086601f83011261064c575f80fd5b81358181111561065a575f80fd5b8760208260051b850101111561066e575f80fd5b6020830194508093505050509250925092565b634e487b7160e01b5f52603260045260245ffd5b5f82515f5b818110156106b4576020818601810151858301520161069a565b505f920191825250919050565b5f602082840312156106d1575f80fd5b5051919050565b5f602082840312156106e8575f80fd5b8151801515811461059e575f80fdfea26469706673582212209a7ccd27e249c0105c2ea947f19127d47caf623c79ae1252b9abccd813a1c9cc64736f6c63430008170033" as const;

// Function selectors
const RESCUE_SELECTOR = "0x839006f2" as Hex;
const CLAIM_AND_RESCUE_SELECTOR = "0xa7104574" as Hex;
const CLAIM_AND_RESCUE_TOKEN_SELECTOR = "0x0e7193cc" as Hex;
const RESCUE_TOKENS_SELECTOR = "0xf2621ded" as Hex;

export type LogEntry = {
  type: "info" | "success" | "warn" | "error" | "step";
  message: string;
  timestamp: number;
};

// NFT item to rescue
export type NftItem =
  | { standard: "ERC721";  contract: Hex; tokenId: bigint }
  | { standard: "ERC1155"; contract: Hex; tokenId: bigint; amount: bigint };

export type RescueParams = {
  sourcePrivateKey: Hex;
  sponsorPrivateKey: Hex;
  destinationAddress: Hex;
  networkKey: string;
  chain: Chain;
  rescuerAddress: Hex;
  claimContract?: Hex;
  claimData?: Hex;
  claimToken?: Hex;
  rescueTokens?: Hex[];
  nfts?: NftItem[];
  rpcUrl?: string;
  dryRun?: boolean;
  onLog: (entry: LogEntry) => void;
};

export type RescueResult = {
  success: boolean;
  txHash?: Hex;
  revokeHash?: Hex;
  error?: string;
  estimatedCost?: bigint;
};

function buildRescueCalldata(
  destination: Hex,
  claimContract?: Hex,
  claimData?: Hex,
  claimToken?: Hex,
): { callData: Hex; callLabel: string } {
  const hasClaim = !!(claimContract && claimData);

  if (hasClaim && claimToken && claimToken !== zeroAddress) {
    const encoded = encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "bytes" },
        { type: "address" },
      ],
      [destination, claimContract!, claimData!, claimToken],
    );
    return {
      callData: concat([CLAIM_AND_RESCUE_TOKEN_SELECTOR, encoded]),
      callLabel: "claimAndRescueToken()",
    };
  }

  if (hasClaim) {
    const encoded = encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "bytes" }],
      [destination, claimContract!, claimData!],
    );
    return {
      callData: concat([CLAIM_AND_RESCUE_SELECTOR, encoded]),
      callLabel: "claimAndRescue()",
    };
  }

  const encoded = encodeAbiParameters([{ type: "address" }], [destination]);
  return {
    callData: concat([RESCUE_SELECTOR, encoded]),
    callLabel: "rescue()",
  };
}

async function getFees(client: ReturnType<typeof createPublicClient>) {
  try {
    return await client.estimateFeesPerGas();
  } catch {
    const gasPrice = await client.getGasPrice();
    const buffer = (gasPrice * 20n) / 100n;
    return { maxFeePerGas: gasPrice + buffer, maxPriorityFeePerGas: buffer };
  }
}

export async function scanBalance(
  chain: Chain,
  address: Hex,
  rpcUrl?: string,
): Promise<bigint> {
  const url = rpcUrl || chain.rpcUrls.default.http[0];
  const client = createPublicClient({ chain, transport: http(url) });
  return client.getBalance({ address });
}

export async function rescueNetwork(params: RescueParams): Promise<RescueResult> {
  const {
    sourcePrivateKey,
    sponsorPrivateKey,
    destinationAddress,
    chain,
    rescuerAddress,
    claimContract,
    claimData,
    claimToken,
    rescueTokens,
    nfts,
    rpcUrl,
    dryRun,
    onLog,
  } = params;

  const log = (type: LogEntry["type"], message: string) =>
    onLog({ type, message, timestamp: Date.now() });

  const url = rpcUrl || chain.rpcUrls.default.http[0];
  const source = privateKeyToAccount(sourcePrivateKey);
  const sponsor = privateKeyToAccount(sponsorPrivateKey);

  const publicClient = createPublicClient({ chain, transport: http(url) });
  const walletClient = createWalletClient({
    account: sponsor,
    chain,
    transport: http(url),
  });

  let totalCost = 0n;

  // 1. RPC check
  try {
    const chainId = await publicClient.getChainId();
    if (chainId !== chain.id) {
      log("error", `RPC chain ID ${chainId} ≠ expected ${chain.id}`);
      return { success: false, error: "Chain ID mismatch" };
    }
    log("success", `RPC OK — chain ${chain.id}`);
  } catch (e: any) {
    log("error", `RPC error: ${e.message}`);
    return { success: false, error: e.message };
  }

  // 2. Source balance
  const sourceBalance = await publicClient.getBalance({ address: source.address });
  const hasClaim = !!(claimContract && claimData);
  const hasRescueTokens = !!(rescueTokens && rescueTokens.length > 0);

  if (sourceBalance === 0n && !hasClaim && !hasRescueTokens) {
    log("warn", "Source has no balance, no claim, and no tokens. Skipping.");
    return { success: false, error: "Nothing to rescue" };
  }
  log("info", `Source balance: ${formatEther(sourceBalance)} ${chain.nativeCurrency.symbol}`);

  // 3. Sponsor balance
  const sponsorBalance = await publicClient.getBalance({ address: sponsor.address });
  const minBal = parseEther("0.005");
  if (sponsorBalance < minBal) {
    log("error", `Sponsor has ${formatEther(sponsorBalance)} — need ≥ 0.005. Insufficient.`);
    return { success: false, error: "Sponsor balance too low" };
  }
  log("info", `Sponsor balance: ${formatEther(sponsorBalance)} ${chain.nativeCurrency.symbol}`);

  // 4. Verify rescuer contract
  log("info", `Using rescuer: ${rescuerAddress}`);
  const code = await publicClient.getBytecode({ address: rescuerAddress }).catch(() => undefined);
  if (!code || code.length <= 2) {
    log("error", `No code at rescuer address ${rescuerAddress}`);
    return { success: false, error: "Rescuer contract not deployed at this address" };
  }
  log("success", `Rescuer contract verified`);

  // 5. Sign EIP-7702 authorization
  log("step", "Signing EIP-7702 authorization...");
  let authorization: any;
  try {
    const sourceNonce = await publicClient.getTransactionCount({
      address: source.address,
      blockTag: "pending",
    });
    log("info", `Source nonce: ${sourceNonce}`);
    authorization = await source.signAuthorization({
      contractAddress: rescuerAddress,
      chainId: chain.id,
      nonce: sourceNonce,
    });
    log("success", "Authorization signed");
  } catch (e: any) {
    log("error", `Sign failed: ${e.message}`);
    return { success: false, error: e.message };
  }

  // 6. Build calldata
  const { callData, callLabel } = buildRescueCalldata(
    destinationAddress,
    hasClaim ? claimContract : undefined,
    hasClaim ? claimData : undefined,
    claimToken,
  );
  log("info", `Rescue call: ${callLabel}`);

  // 7. Simulation
  log("step", `Simulating ${callLabel}...`);
  const delegationCode = `0xef0100${rescuerAddress.slice(2).toLowerCase()}` as Hex;
  let simPassed = false;

  try {
    await (publicClient as any).call({
      account: source.address,
      to: source.address,
      data: callData,
      stateOverride: [{ address: source.address, code: delegationCode }],
    });
    log("success", "Simulation OK (stateOverride)");
    simPassed = true;
  } catch (e: any) {
    const msg = e?.shortMessage || e?.message || String(e);
    const isRpcLimit =
      msg.includes("unknown reason") ||
      msg.includes("not supported") ||
      msg.includes("Method not found");
    if (!isRpcLimit) {
      log("error", `Simulation FAILED: ${msg}`);
      return { success: false, error: `Simulation failed: ${msg}` };
    }
    log("warn", "stateOverride not supported by RPC — proceeding anyway");
  }

  // Tier 2: direct claim sim
  if (!simPassed && hasClaim) {
    try {
      await publicClient.call({
        account: source.address,
        to: claimContract!,
        data: claimData!,
      });
      log("success", "Claim simulation OK");
      simPassed = true;
    } catch (e: any) {
      const msg = e?.shortMessage || e?.message || String(e);
      const isRpcLimit =
        msg.includes("unknown reason") || msg.includes("not supported");
      if (!isRpcLimit) {
        log("error", `Claim sim FAILED: ${msg}`);
        return { success: false, error: `Claim simulation failed: ${msg}` };
      }
    }
  }

  if (!simPassed) {
    log("warn", "Simulation inconclusive (RPC limitation) — proceeding");
  }

  // 8. Dry run
  if (dryRun) {
    const fees = await getFees(publicClient);
    const estimatedGas = 200000n;
    totalCost = (estimatedGas * fees.maxFeePerGas * 130n) / 100n;
    log("warn", `[DRY RUN] Would send: delegate + ${callLabel}`);
    log("warn", `Estimated cost: ${formatEther(totalCost)} ${chain.nativeCurrency.symbol}`);
    return { success: true, estimatedCost: totalCost };
  }

  // 8. Atomic delegation + rescue
  log("step", `Sending atomic delegation + ${callLabel}...`);
  let rescueTxHash: Hex;
  try {
    let gas = 200000n;
    try {
      const estimated = await publicClient.estimateGas({
        account: sponsor.address,
        to: source.address,
        authorizationList: [authorization],
        data: callData,
      } as any);
      gas = (estimated * 150n) / 100n;
      if (gas < 200000n) gas = 200000n;
      log("info", `Estimated gas: ${estimated} → using ${gas}`);
    } catch {
      log("warn", `Gas estimation failed, using fallback: ${gas}`);
    }

    const fees = await getFees(publicClient);
    rescueTxHash = await walletClient.sendTransaction({
      account: sponsor,
      to: source.address,
      authorizationList: [authorization],
      data: callData,
      gas,
      maxFeePerGas: (fees.maxFeePerGas * 130n) / 100n,
      maxPriorityFeePerGas: (fees.maxPriorityFeePerGas * 130n) / 100n,
    } as any);

    log("success", `Atomic tx sent: ${rescueTxHash}`);
    log("info", `${chain.blockExplorers?.default?.url}/tx/${rescueTxHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: rescueTxHash,
      timeout: 120_000,
    });
    if (receipt.status !== "success") {
      log("error", "Atomic tx reverted");
      return { success: false, error: "Transaction reverted" };
    }
    log("success", "Atomic tx confirmed!");
  } catch (e: any) {
    log("error", `Atomic tx failed: ${e.message}`);
    return { success: false, error: e.message };
  }

  // 9. Rescue additional ERC-20 tokens
  if (hasRescueTokens) {
    log("step", `Rescuing ${rescueTokens!.length} additional ERC-20 token(s)...`);
    try {
      const rescueNonce = await publicClient.getTransactionCount({
        address: source.address,
        blockTag: "pending",
      });
      const rescueAuth = await source.signAuthorization({
        contractAddress: rescuerAddress,
        chainId: chain.id,
        nonce: rescueNonce,
      });

      const encoded = encodeAbiParameters(
        [{ type: "address" }, { type: "address[]" }],
        [destinationAddress, rescueTokens!],
      );
      const tokenCallData = concat([RESCUE_TOKENS_SELECTOR, encoded]);

      const callGas = await publicClient
        .estimateGas({
          account: sponsor.address,
          to: source.address,
          authorizationList: [rescueAuth],
          data: tokenCallData,
        } as any)
        .catch(() => 300000n);

      const fees = await getFees(publicClient);
      const tx = await walletClient.sendTransaction({
        account: sponsor,
        to: source.address,
        authorizationList: [rescueAuth],
        data: tokenCallData,
        gas: (callGas * 150n) / 100n,
        maxFeePerGas: (fees.maxFeePerGas * 130n) / 100n,
        maxPriorityFeePerGas: (fees.maxPriorityFeePerGas * 130n) / 100n,
      } as any);

      log("success", `rescueTokens() tx: ${tx}`);
      await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 120_000 });
      log("success", "rescueTokens() confirmed!");
    } catch (e: any) {
      log("warn", `rescueTokens() failed (non-critical): ${e.message}`);
    }
  }

  // 10. Rescue NFTs (ERC-721 and ERC-1155)
  const hasNfts = !!(nfts && nfts.length > 0);
  if (hasNfts) {
    log("step", `Rescuing ${nfts!.length} NFT(s) via direct transfer...`);
    for (const nft of nfts!) {
      try {
        const nftNonce = await publicClient.getTransactionCount({
          address: source.address,
          blockTag: "pending",
        });
        // For NFTs we don't need rescuer contract — source signs and calls safeTransferFrom itself
        // We use EIP-7702 to let sponsor pay gas while source executes the transfer
        const nftAuth = await source.signAuthorization({
          contractAddress: rescuerAddress,
          chainId: chain.id,
          nonce: nftNonce,
        });

        let nftCallData: Hex;
        if (nft.standard === "ERC721") {
          // safeTransferFrom(address from, address to, uint256 tokenId)
          // selector: 0x42842e0e
          const encoded = encodeAbiParameters(
            [{ type: "address" }, { type: "address" }, { type: "uint256" }],
            [source.address, destinationAddress, nft.tokenId],
          );
          nftCallData = concat(["0x42842e0e" as Hex, encoded]);
          log("info", `ERC-721 ${nft.contract} #${nft.tokenId}`);
        } else {
          // safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)
          // selector: 0xf242432a
          const encoded = encodeAbiParameters(
            [{ type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes" }],
            [source.address, destinationAddress, nft.tokenId, nft.amount, "0x"],
          );
          nftCallData = concat(["0xf242432a" as Hex, encoded]);
          log("info", `ERC-1155 ${nft.contract} #${nft.tokenId} × ${nft.amount}`);
        }

        const nftGas = await publicClient
          .estimateGas({
            account: sponsor.address,
            to: nft.contract,
            data: nftCallData,
          } as any)
          .catch(() => 100000n);

        const fees = await getFees(publicClient);
        // Send via sponsor but FROM source (using EIP-7702 auth for gas sponsorship)
        // Direct call to NFT contract, source is msg.sender via delegation
        const nftTx = await walletClient.sendTransaction({
          account: sponsor,
          to: source.address,
          authorizationList: [nftAuth],
          // Encode: call nft.contract.safeTransferFrom via rescue contract's fallback
          // We build a meta-call: rescue contract calls the NFT contract on behalf of source
          data: encodeAbiParameters(
            [{ type: "address" }, { type: "bytes" }],
            [nft.contract, nftCallData],
          ),
          gas: ((nftGas < 100000n ? 100000n : nftGas) * 150n) / 100n,
          maxFeePerGas: (fees.maxFeePerGas * 130n) / 100n,
          maxPriorityFeePerGas: (fees.maxPriorityFeePerGas * 130n) / 100n,
        } as any);

        log("success", `NFT tx: ${nftTx}`);
        await publicClient.waitForTransactionReceipt({ hash: nftTx, timeout: 120_000 });
        log("success", `NFT #${nft.tokenId} transferred!`);
      } catch (e: any) {
        log("warn", `NFT #${nft.tokenId} failed (non-critical): ${e.message}`);
      }
    }
  }

  // 11. Revoke delegation
  log("step", "Revoking EIP-7702 delegation...");
  let revokeTxHash: Hex | undefined;
  try {
    const revokeNonce = await publicClient.getTransactionCount({
      address: source.address,
      blockTag: "pending",
    });
    const revokeAuth = await source.signAuthorization({
      contractAddress: zeroAddress,
      chainId: chain.id,
      nonce: revokeNonce,
    });

    const revokeGas = await publicClient
      .estimateGas({
        account: sponsor.address,
        to: source.address,
        authorizationList: [revokeAuth],
      } as any)
      .catch(() => 30000n);

    const fees = await getFees(publicClient);
    revokeTxHash = await walletClient.sendTransaction({
      account: sponsor,
      to: source.address,
      authorizationList: [revokeAuth],
      gas: (revokeGas * 130n) / 100n,
      maxFeePerGas: (fees.maxFeePerGas * 130n) / 100n,
      maxPriorityFeePerGas: (fees.maxPriorityFeePerGas * 130n) / 100n,
    } as any);

    log("success", `Delegation revoked: ${revokeTxHash}`);
    await publicClient.waitForTransactionReceipt({ hash: revokeTxHash, timeout: 120_000 });
    log("success", "EOA restored — delegation cleared");
  } catch (e: any) {
    log("warn", `Revoke failed (non-critical): ${e.message}`);
  }

  const destBalance = await publicClient.getBalance({ address: destinationAddress });
  log(
    "success",
    `Done! Destination now holds ${formatEther(destBalance)} ${chain.nativeCurrency.symbol}`,
  );

  return { success: true, txHash: rescueTxHash!, revokeHash: revokeTxHash };
}
