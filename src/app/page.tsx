"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { formatEther, isAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { supportedNetworks } from "@/lib/networks";
import { rescueNetwork, scanBalance, type LogEntry, type RescueResult, type NftItem } from "@/lib/rescue";

// ─── i18n ────────────────────────────────────────────────────────────────────

const T = {
  en: {
    logo: "EIP-7702 Rescue",
    steps: ["config", "review", "executing", "done"],
    secTitle: "⚠ Security Notice",
    secBody: "Private keys never leave your browser. No server receives them. Verify you're on the correct domain before entering keys.",
    s01: "01 / Wallets",
    s02: "02 / Network",
    s03: "03 / Claim & Tokens (optional)",
    s04: "04 / NFTs (optional)",
    nftHint: "One NFT per line. Format: CONTRACT_ADDRESS:TOKEN_ID or CONTRACT_ADDRESS:TOKEN_ID:AMOUNT (ERC-1155)",
    nftLabel: "NFTs to rescue",
    nftPlaceholder: "0xContract:1234\n0xContract:5678:2",
    nftReview: "NFTs",
    srcLabel: "Source Private Key (compromised)",
    srcHint: "0x-prefixed, 64 hex chars",
    sponLabel: "Sponsor Private Key (pays gas)",
    sponHint: "0x-prefixed, 64 hex chars",
    dstLabel: "Destination Address (safe recipient)",
    useWallet: (addr: string) => `← use connected wallet (${addr})`,
    show: "show", hide: "hide",
    claimContractLabel: "Claim Contract Address",
    claimContractHint: "Layer3, Galxe or other reward contract",
    claimDataLabel: "Claim Calldata",
    claimDataHint: "Hex data from MetaMask → Hex tab",
    claimTokenLabel: "Claim Token (ERC-20)",
    claimTokenHint: "Token received after claim",
    rescueTokensLabel: "Additional Rescue Tokens",
    rescueTokensHint: "Comma-separated ERC-20 addresses",
    rpcLabel: "Custom RPC URL",
    rpcHint: "Recommended: Alchemy/Infura for reliable simulation",
    dryRun: "DRY RUN — simulate only, no transactions sent",
    btnReview: "Review →",
    reviewTitle: "Review & Confirm",
    reviewSubtitle: "Verify all details before executing rescue.",
    network: "Network", chainId: "Chain ID",
    source: "Source (compromised)", sponsor: "Sponsor (gas payer)",
    destination: "Destination (safe)", rescuer: "Rescuer Contract",
    claimContract: "Claim Contract", claimToken: "Claim Token",
    rescueTokens: "Rescue Tokens", mode: "Mode",
    modeDry: "DRY RUN (no transactions)", modeLive: "LIVE — transactions WILL be sent",
    liveWarningTitle: "⚠ Live Mode",
    liveWarningBody: (net: string) => `Real transactions will be sent on ${net}. Sponsor pays gas. Funds will move to destination.`,
    btnBack: "← Back",
    btnSimulate: "Simulate →",
    btnExecute: "Execute Rescue →",
    execLabel: "Executing...",
    doneLabel: "Complete",
    errLabel: "Failed",
    init: "Initializing",
    txRescue: "Rescue Transaction",
    txRevoke: "Revoke Transaction",
    estCost: "Estimated cost",
    errTitle: "Error",
    warningUsed: "⚠ The compromised wallet's private key is still known to the attacker. Do not use that wallet again.",
    btnNew: "← New Rescue",
    // sidebar
    statusTitle: "Status",
    netLabel: "Network", srcSide: "Source", sponSide: "Sponsor",
    balLabel: "Balance", gasLabel: "Gas bal",
    notSet: "not set",
    howTitle: "How it works",
    how: [
      ["01", "Source wallet signs EIP-7702 authorization (no tx)"],
      ["02", "Sponsor sends one atomic tx: delegate + rescue"],
      ["03", "Rescue contract forwards ETH & tokens to destination"],
      ["04", "Delegation is revoked — EOA restored"],
    ],
    rescuersTitle: "Deployed Rescuers",
    securityTitle: "Security",
    security: ["Keys never leave your browser", "No server, no custody", "Atomic — no front-run window", "Contract holds no funds"],
    // validation
    vSrcReq: "Source private key is required",
    vSrcFmt: "Source private key: 0x + 64 hex chars",
    vSponReq: "Sponsor private key is required",
    vSponFmt: "Sponsor private key: 0x + 64 hex chars",
    vSame: "Source and Sponsor keys must be different",
    vDstReq: "Destination address is required",
    vDstFmt: "Destination: invalid address",
    vNet: "Select a network",
    vClaimAddr: "Claim contract: invalid address",
    vClaimData: "Claim data must start with 0x",
    vClaimPair: "Claim contract and claim data must both be set",
    vClaimToken: "Claim token: invalid address",
    vToken: (t: string) => `Invalid token address: ${t}`,
  },
  ru: {
    logo: "EIP-7702 Rescue",
    steps: ["конфиг", "проверка", "выполнение", "готово"],
    secTitle: "⚠ Уведомление безопасности",
    secBody: "Приватные ключи никогда не покидают браузер. Сервер их не получает. Убедитесь что вы на правильном домене перед вводом ключей.",
    s01: "01 / Кошельки",
    s02: "02 / Сеть",
    s03: "03 / Claim & Токены (опционально)",
    s04: "04 / NFT (опционально)",
    nftHint: "Один NFT на строку. Формат: АДРЕС_КОНТРАКТА:TOKEN_ID или АДРЕС_КОНТРАКТА:TOKEN_ID:КОЛИЧЕСТВО (ERC-1155)",
    nftLabel: "NFT для rescue",
    nftPlaceholder: "0xContract:1234\n0xContract:5678:2",
    nftReview: "NFTs",
    srcLabel: "Source Private Key (скомпрометированный)",
    srcHint: "0x-prefixed, 64 hex символа",
    sponLabel: "Sponsor Private Key (платит газ)",
    sponHint: "0x-prefixed, 64 hex символа",
    dstLabel: "Destination Address (безопасный получатель)",
    useWallet: (addr: string) => `← использовать подключённый кошелёк (${addr})`,
    show: "показать", hide: "скрыть",
    claimContractLabel: "Claim Contract Address",
    claimContractHint: "Layer3, Galxe и другие reward контракты",
    claimDataLabel: "Claim Calldata",
    claimDataHint: "Hex данные из MetaMask → вкладка Hex",
    claimTokenLabel: "Claim Token (ERC-20)",
    claimTokenHint: "Токен который получаете после клейма",
    rescueTokensLabel: "Дополнительные токены для rescue",
    rescueTokensHint: "ERC-20 адреса через запятую",
    rpcLabel: "Кастомный RPC URL",
    rpcHint: "Рекомендуется Alchemy/Infura для стабильной симуляции",
    dryRun: "DRY RUN — симуляция, без отправки транзакций",
    btnReview: "Проверить →",
    reviewTitle: "Проверка и подтверждение",
    reviewSubtitle: "Проверьте все данные перед выполнением rescue.",
    network: "Сеть", chainId: "Chain ID",
    source: "Source (скомпрометированный)", sponsor: "Sponsor (платит газ)",
    destination: "Destination (безопасный)", rescuer: "Rescuer Contract",
    claimContract: "Claim Contract", claimToken: "Claim Token",
    rescueTokens: "Rescue Tokens", mode: "Режим",
    modeDry: "DRY RUN (без транзакций)", modeLive: "LIVE — транзакции БУДУТ отправлены",
    liveWarningTitle: "⚠ Live Mode",
    liveWarningBody: (net: string) => `Будут отправлены реальные транзакции в сети ${net}. Sponsor оплатит газ. Средства переедут на destination.`,
    btnBack: "← Назад",
    btnSimulate: "Симулировать →",
    btnExecute: "Выполнить Rescue →",
    execLabel: "Выполняется...",
    doneLabel: "Завершено",
    errLabel: "Ошибка",
    init: "Инициализация",
    txRescue: "Rescue Transaction",
    txRevoke: "Revoke Transaction",
    estCost: "Примерная стоимость",
    errTitle: "Ошибка",
    warningUsed: "⚠ Приватный ключ скомпрометированного кошелька по-прежнему известен злоумышленнику. Больше не используйте этот кошелёк.",
    btnNew: "← Новый Rescue",
    statusTitle: "Статус",
    netLabel: "Сеть", srcSide: "Source", sponSide: "Sponsor",
    balLabel: "Баланс", gasLabel: "Газ",
    notSet: "не задан",
    howTitle: "Как это работает",
    how: [
      ["01", "Source подписывает EIP-7702 авторизацию (без tx)"],
      ["02", "Sponsor отправляет одну атомарную tx: delegate + rescue"],
      ["03", "Rescue контракт переводит ETH и токены на destination"],
      ["04", "Делегация отзывается — EOA восстановлен"],
    ],
    rescuersTitle: "Задеплоенные Rescuers",
    securityTitle: "Безопасность",
    security: ["Ключи не покидают браузер", "Нет сервера, нет кастодии", "Атомарно — без front-run окна", "Контракт не хранит средства"],
    vSrcReq: "Source private key обязателен",
    vSrcFmt: "Source private key: 0x + 64 hex символа",
    vSponReq: "Sponsor private key обязателен",
    vSponFmt: "Sponsor private key: 0x + 64 hex символа",
    vSame: "Source и Sponsor ключи должны быть разными",
    vDstReq: "Destination address обязателен",
    vDstFmt: "Destination: невалидный адрес",
    vNet: "Выберите сеть",
    vClaimAddr: "Claim contract: невалидный адрес",
    vClaimData: "Claim data должна начинаться с 0x",
    vClaimPair: "Claim contract и claim data должны быть заполнены вместе",
    vClaimToken: "Claim token: невалидный адрес",
    vToken: (t: string) => `Невалидный токен: ${t}`,
  },
} as const;

type Lang = keyof typeof T;
type Strings = typeof T.en;

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "config" | "review" | "executing" | "done";

type FormState = {
  sourcePrivateKey: string;
  sponsorPrivateKey: string;
  destinationAddress: string;
  networkKey: string;
  claimContract: string;
  claimData: string;
  claimToken: string;
  rescueTokens: string;
  nftsRaw: string;
  rpcUrl: string;
  dryRun: boolean;
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateForm(form: FormState, t: Strings): string[] {
  const errors: string[] = [];
  if (!form.sourcePrivateKey) errors.push(t.vSrcReq);
  else if (!form.sourcePrivateKey.startsWith("0x") || form.sourcePrivateKey.length !== 66) errors.push(t.vSrcFmt);
  if (!form.sponsorPrivateKey) errors.push(t.vSponReq);
  else if (!form.sponsorPrivateKey.startsWith("0x") || form.sponsorPrivateKey.length !== 66) errors.push(t.vSponFmt);
  if (form.sourcePrivateKey && form.sponsorPrivateKey && form.sourcePrivateKey === form.sponsorPrivateKey) errors.push(t.vSame);
  if (!form.destinationAddress) errors.push(t.vDstReq);
  else if (!isAddress(form.destinationAddress)) errors.push(t.vDstFmt);
  if (!form.networkKey) errors.push(t.vNet);
  if (form.claimContract && !isAddress(form.claimContract)) errors.push(t.vClaimAddr);
  if (form.claimData && !form.claimData.startsWith("0x")) errors.push(t.vClaimData);
  if ((form.claimContract && !form.claimData) || (!form.claimContract && form.claimData)) errors.push(t.vClaimPair);
  if (form.claimToken && !isAddress(form.claimToken)) errors.push(t.vClaimToken);
  if (form.rescueTokens)
    for (const tok of form.rescueTokens.split(",").map(x => x.trim()).filter(Boolean))
      if (!isAddress(tok)) errors.push(t.vToken(tok));
  return errors;
}

function parseNfts(raw: string): NftItem[] {
  return raw.split("\n").map(l => l.trim()).filter(Boolean).flatMap(line => {
    const parts = line.split(":");
    if (parts.length < 2) return [];
    const contract = parts[0].trim() as Hex;
    const tokenId = BigInt(parts[1].trim());
    if (!isAddress(contract)) return [];
    if (parts.length >= 3 && parts[2].trim()) {
      return [{ standard: "ERC1155" as const, contract, tokenId, amount: BigInt(parts[2].trim()) }];
    }
    return [{ standard: "ERC721" as const, contract, tokenId }];
  });
}


  try {
    if (pk.startsWith("0x") && pk.length === 66) return privateKeyToAccount(pk as Hex).address;
  } catch {}
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PrivateKeyInput({ value, onChange, placeholder, t }: {
  value: string; onChange: (v: string) => void; placeholder?: string; t: Strings;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="field-input has-btn"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="button" className="input-btn" onClick={() => setShow(s => !s)}>
        {show ? t.hide : t.show}
      </button>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="field-input"
      autoComplete="off"
      spellCheck={false}
    />
  );
}

const LOG_PREFIXES: Record<LogEntry["type"], string> = {
  info: "  ·", success: "  ✓", warn: "  ⚠", error: "  ✗", step: "  »",
};

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className={`log-line log-${entry.type}`}>
      <span className="log-prefix">{LOG_PREFIXES[entry.type]}</span>
      <span className="log-msg">{entry.message}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  const [step, setStep] = useState<Step>("config");
  const [form, setForm] = useState<FormState>({
    sourcePrivateKey: "", sponsorPrivateKey: "", destinationAddress: "",
    networkKey: "base", claimContract: "", claimData: "", claimToken: "",
    rescueTokens: "", nftsRaw: "", rpcUrl: "", dryRun: false,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<RescueResult | null>(null);
  const [sourceBalance, setSourceBalance] = useState<bigint | null>(null);
  const [sponsorBalance, setSponsorBalance] = useState<bigint | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { address: connectedAddress } = useAccount();

  useEffect(() => {
    if (connectedAddress && !form.destinationAddress)
      setForm(f => ({ ...f, destinationAddress: connectedAddress }));
  }, [connectedAddress]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    const network = supportedNetworks.find(n => n.key === form.networkKey);
    if (!network) return;
    const srcAddr = deriveAddress(form.sourcePrivateKey);
    const sponAddr = deriveAddress(form.sponsorPrivateKey);
    setSourceBalance(null); setSponsorBalance(null);
    if (srcAddr) scanBalance(network.chain as any, srcAddr as Hex, form.rpcUrl || undefined).then(setSourceBalance).catch(() => {});
    if (sponAddr) scanBalance(network.chain as any, sponAddr as Hex, form.rpcUrl || undefined).then(setSponsorBalance).catch(() => {});
  }, [form.sourcePrivateKey, form.sponsorPrivateKey, form.networkKey, form.rpcUrl]);

  const addLog = useCallback((entry: LogEntry) => setLogs(p => [...p, entry]), []);

  const handleReview = () => {
    const errs = validateForm(form, t);
    setErrors(errs);
    if (!errs.length) setStep("review");
  };

  const handleExecute = async () => {
    const network = supportedNetworks.find(n => n.key === form.networkKey)!;
    setStep("executing"); setLogs([]);
    const rescueTokensList = form.rescueTokens
      ? form.rescueTokens.split(",").map(x => x.trim()).filter(isAddress) as Hex[]
      : undefined;
    const nftsList = form.nftsRaw ? parseNfts(form.nftsRaw) : undefined;
    const res = await rescueNetwork({
      sourcePrivateKey: form.sourcePrivateKey as Hex,
      sponsorPrivateKey: form.sponsorPrivateKey as Hex,
      destinationAddress: form.destinationAddress as Hex,
      networkKey: form.networkKey,
      chain: network.chain as any,
      rescuerAddress: network.rescuerAddress as Hex,
      claimContract: form.claimContract ? form.claimContract as Hex : undefined,
      claimData: form.claimData ? form.claimData as Hex : undefined,
      claimToken: form.claimToken ? form.claimToken as Hex : undefined,
      rescueTokens: rescueTokensList,
      nfts: nftsList,
      rpcUrl: form.rpcUrl || undefined,
      dryRun: form.dryRun,
      onLog: addLog,
    });
    setResult(res); setStep("done");
  };

  const handleReset = () => {
    setStep("config"); setLogs([]); setResult(null); setErrors([]);
    setForm(f => ({ ...f, sourcePrivateKey: "", sponsorPrivateKey: "", claimContract: "", claimData: "", claimToken: "", rescueTokens: "", nftsRaw: "" }));
  };

  const net = supportedNetworks.find(n => n.key === form.networkKey);
  const srcAddr = deriveAddress(form.sourcePrivateKey);
  const sponAddr = deriveAddress(form.sponsorPrivateKey);
  const sym = net?.chain.nativeCurrency.symbol ?? "ETH";
  const STEPS: Step[] = ["config", "review", "executing", "done"];

  return (
    <div className="page">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-dot" />
          <span className="logo-text">{t.logo}</span>
          <span className="logo-badge">v1.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Lang switcher */}
          <div className="lang-switcher">
            {(["en", "ru"] as Lang[]).map(l => (
              <button
                key={l}
                className={`lang-btn${lang === l ? " active" : ""}`}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <nav className="breadcrumb">
        {STEPS.map((s, i) => (
          <span key={s}>
            {i > 0 && <span className="breadcrumb-sep">›</span>}
            <span className={step === s ? "breadcrumb-active" : ""}>{t.steps[i]}</span>
          </span>
        ))}
      </nav>

      {/* ── Main ── */}
      <main className="main">

        {/* Left panel */}
        <div className="panel-left">
          <div className="panel-left-inner anim-fade">

            {/* ════ CONFIG ════ */}
            {step === "config" && <>

              <div className="alert alert-warning">
                <div className="alert-title">{t.secTitle}</div>
                {t.secBody}
              </div>

              {/* 01 Wallets */}
              <div className="section">
                <div className="divider">
                  <div className="divider-line" /><span className="divider-label">{t.s01}</span><div className="divider-line" />
                </div>

                <div className="field">
                  <div className="field-label">{t.srcLabel}</div>
                  <PrivateKeyInput value={form.sourcePrivateKey} onChange={v => setForm(f => ({ ...f, sourcePrivateKey: v }))} placeholder="0x..." t={t} />
                  <div className="field-hint">{srcAddr ? `→ ${srcAddr}` : t.srcHint}</div>
                </div>

                <div className="field">
                  <div className="field-label">{t.sponLabel}</div>
                  <PrivateKeyInput value={form.sponsorPrivateKey} onChange={v => setForm(f => ({ ...f, sponsorPrivateKey: v }))} placeholder="0x..." t={t} />
                  <div className="field-hint">{sponAddr ? `→ ${sponAddr}` : t.sponHint}</div>
                </div>

                <div className="field">
                  <div className="field-label">{t.dstLabel}</div>
                  <TextInput value={form.destinationAddress} onChange={v => setForm(f => ({ ...f, destinationAddress: v }))} placeholder="0x..." />
                  {connectedAddress && (
                    <button className="wallet-link" onClick={() => setForm(f => ({ ...f, destinationAddress: connectedAddress }))}>
                      {t.useWallet(`${connectedAddress.slice(0,6)}…${connectedAddress.slice(-4)}`)}
                    </button>
                  )}
                </div>
              </div>

              {/* 02 Network */}
              <div className="section">
                <div className="divider">
                  <div className="divider-line" /><span className="divider-label">{t.s02}</span><div className="divider-line" />
                </div>
                <div className="network-grid">
                  {supportedNetworks.map(n => (
                    <button key={n.key} className={`network-btn${form.networkKey === n.key ? " active" : ""}`} onClick={() => setForm(f => ({ ...f, networkKey: n.key }))}>
                      <div className="network-btn-name">{n.chain.name}</div>
                      <div className="network-btn-id">chain {n.chain.id}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 03 Claim & Tokens */}
              <div className="section">
                <button className="advanced-toggle" onClick={() => setShowAdvanced(s => !s)}>
                  <div className="divider-line" />
                  <span className="divider-label">{t.s03}&nbsp;<span className="advanced-arrow">{showAdvanced ? "▲" : "▼"}</span></span>
                  <div className="divider-line" />
                </button>

                {showAdvanced && <div style={{ marginTop: 16 }}>
                  <div className="field">
                    <div className="field-label">{t.claimContractLabel}</div>
                    <TextInput value={form.claimContract} onChange={v => setForm(f => ({ ...f, claimContract: v }))} placeholder="0x..." />
                    <div className="field-hint">{t.claimContractHint}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">{t.claimDataLabel}</div>
                    <TextInput value={form.claimData} onChange={v => setForm(f => ({ ...f, claimData: v }))} placeholder="0x..." />
                    <div className="field-hint">{t.claimDataHint}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">{t.claimTokenLabel}</div>
                    <TextInput value={form.claimToken} onChange={v => setForm(f => ({ ...f, claimToken: v }))} placeholder="0x..." />
                    <div className="field-hint">{t.claimTokenHint}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">{t.rescueTokensLabel}</div>
                    <TextInput value={form.rescueTokens} onChange={v => setForm(f => ({ ...f, rescueTokens: v }))} placeholder="0xToken1,0xToken2" />
                    <div className="field-hint">{t.rescueTokensHint}</div>
                  </div>
                  <div className="field">
                    <div className="field-label">{t.rpcLabel}</div>
                    <TextInput value={form.rpcUrl} onChange={v => setForm(f => ({ ...f, rpcUrl: v }))} placeholder="https://..." />
                    <div className="field-hint">{t.rpcHint}</div>
                  </div>
                </div>}
              </div>

              {/* 04 NFTs */}
              <div className="section">
                <div className="divider">
                  <div className="divider-line" /><span className="divider-label">{t.s04}</span><div className="divider-line" />
                </div>
                <div className="field">
                  <div className="field-label">{t.nftLabel}</div>
                  <textarea
                    value={form.nftsRaw}
                    onChange={e => setForm(f => ({ ...f, nftsRaw: e.target.value }))}
                    placeholder={t.nftPlaceholder}
                    className="field-input"
                    style={{ minHeight: 80, resize: "vertical", lineHeight: 1.6 }}
                    spellCheck={false}
                  />
                  <div className="field-hint">{t.nftHint}</div>
                </div>
              </div>

              {/* Dry Run */}
              <button className={`toggle-row${form.dryRun ? " on" : ""}`} onClick={() => setForm(f => ({ ...f, dryRun: !f.dryRun }))}>
                <div className="toggle-track"><div className="toggle-thumb" /></div>
                {t.dryRun}
              </button>

              {errors.length > 0 && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  {errors.map((e, i) => <div key={i}>✗ {e}</div>)}
                </div>
              )}

              <button className="btn btn-primary" onClick={handleReview}>{t.btnReview}</button>
            </>}

            {/* ════ REVIEW ════ */}
            {step === "review" && <>
              <div style={{ marginBottom: 20 }}>
                <div className="logo-text" style={{ fontSize: 15, marginBottom: 4 }}>{t.reviewTitle}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.reviewSubtitle}</div>
              </div>

              <div className="review-table">
                {([
                  [t.network, net?.chain.name ?? form.networkKey],
                  [t.chainId, String(net?.chain.id ?? "—")],
                  [t.source, srcAddr ?? "—"],
                  [t.sponsor, sponAddr ?? "—"],
                  [t.destination, form.destinationAddress],
                  [t.rescuer, net?.rescuerAddress ?? "—"],
                  ...(form.claimContract ? [[t.claimContract, form.claimContract]] : []),
                  ...(form.claimToken ? [[t.claimToken, form.claimToken]] : []),
                  ...(form.rescueTokens ? [[t.rescueTokens, form.rescueTokens]] : []),
                  ...(form.nftsRaw ? [[t.nftReview, `${parseNfts(form.nftsRaw).length} item(s)`]] : []),
                  [t.mode, form.dryRun ? t.modeDry : t.modeLive],
                ] as [string, string][]).map(([k, v]) => (
                  <div className="review-row" key={k}>
                    <div className="review-key">{k}</div>
                    <div className={`review-val${k === t.mode && !form.dryRun ? " highlight" : ""}`}>{v}</div>
                  </div>
                ))}
              </div>

              {!form.dryRun && (
                <div className="alert alert-warning">
                  <div className="alert-title">{t.liveWarningTitle}</div>
                  {t.liveWarningBody(net?.chain.name ?? "")}
                </div>
              )}

              <div className="btn-row">
                <button className="btn btn-secondary" onClick={() => setStep("config")}>{t.btnBack}</button>
                <button className={`btn ${form.dryRun ? "btn-purple" : "btn-primary"}`} onClick={handleExecute}>
                  {form.dryRun ? t.btnSimulate : t.btnExecute}
                </button>
              </div>
            </>}

            {/* ════ EXECUTING / DONE ════ */}
            {(step === "executing" || step === "done") && <>
              <div className="exec-header">
                <div className={`status-dot ${step === "executing" ? "status-executing" : result?.success ? "status-success" : "status-error"}`} />
                <span className="exec-label" style={{
                  color: step === "executing" ? "var(--amber)" : result?.success ? "var(--green)" : "var(--red)"
                }}>
                  {step === "executing" ? t.execLabel : result?.success ? t.doneLabel : t.errLabel}
                </span>
              </div>

              <div className="terminal">
                {logs.length === 0 && <div className="log-line log-info"><span className="log-msg">{t.init}<span className="anim-blink">_</span></span></div>}
                {logs.map((e, i) => <LogLine key={i} entry={e} />)}
                {step === "executing" && <div className="log-info"><span className="anim-blink">█</span></div>}
                <div ref={logsEndRef} />
              </div>

              {step === "done" && result && <div style={{ marginTop: 16 }}>
                {result.txHash && (
                  <div className="tx-box">
                    <div className="tx-box-label">{t.txRescue}</div>
                    <a className="tx-box-hash" href={`${net?.chain.blockExplorers?.default.url}/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer">{result.txHash}</a>
                  </div>
                )}
                {result.revokeHash && (
                  <div className="tx-box">
                    <div className="tx-box-label">{t.txRevoke}</div>
                    <a className="tx-box-hash" href={`${net?.chain.blockExplorers?.default.url}/tx/${result.revokeHash}`} target="_blank" rel="noopener noreferrer">{result.revokeHash}</a>
                  </div>
                )}
                {result.estimatedCost && (
                  <div className="alert alert-purple">{t.estCost}: {formatEther(result.estimatedCost)} {sym}</div>
                )}
                {!result.success && result.error && (
                  <div className="alert alert-error">
                    <div className="alert-title">{t.errTitle}</div>
                    {result.error}
                  </div>
                )}
                {result.success && <div className="alert alert-warning" style={{ marginBottom: 16 }}>{t.warningUsed}</div>}
                <button className="btn btn-secondary" onClick={handleReset}>{t.btnNew}</button>
              </div>}
            </>}

          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-inner">

            <div className="sidebar-section">
              <div className="sidebar-title">{t.statusTitle}</div>
              <div className="status-row"><span className="status-key">{t.netLabel}</span><span className="status-val">{net?.chain.name ?? "—"}</span></div>
              <div className="status-row"><span className="status-key">{t.srcSide}</span><span className="status-val">{srcAddr ? `${srcAddr.slice(0,8)}…${srcAddr.slice(-6)}` : t.notSet}</span></div>
              {sourceBalance !== null && <div className="status-row"><span className="status-key">{t.balLabel}</span><span className="status-val">{formatEther(sourceBalance)} {sym}</span></div>}
              <div className="status-row"><span className="status-key">{t.sponSide}</span><span className="status-val">{sponAddr ? `${sponAddr.slice(0,8)}…${sponAddr.slice(-6)}` : t.notSet}</span></div>
              {sponsorBalance !== null && <div className="status-row"><span className="status-key">{t.gasLabel}</span><span className="status-val">{formatEther(sponsorBalance)} {sym}</span></div>}
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-section">
              <div className="sidebar-title">{t.howTitle}</div>
              {t.how.map(([n, txt]) => (
                <div className="how-item" key={n}>
                  <span className="how-num">{n}</span>
                  <span className="how-txt">{txt}</span>
                </div>
              ))}
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-section">
              <div className="sidebar-title">{t.rescuersTitle}</div>
              {supportedNetworks.map(n => (
                <div className="rescuer-row" key={n.key}>
                  <span className="rescuer-net">{n.chain.name}: </span>
                  <a className="rescuer-addr" href={`${n.chain.blockExplorers?.default.url}/address/${n.rescuerAddress}`} target="_blank" rel="noopener noreferrer">
                    {n.rescuerAddress.slice(0,10)}…{n.rescuerAddress.slice(-8)}
                  </a>
                </div>
              ))}
            </div>

            <div className="sidebar-divider" />

            <div className="sidebar-section">
              <div className="sidebar-title">{t.securityTitle}</div>
              {t.security.map(txt => (
                <div className="security-item" key={txt}>
                  <span className="security-check">✓</span>
                  <span>{txt}</span>
                </div>
              ))}
            </div>

          </div>
        </aside>

      </main>
    </div>
  );
}
