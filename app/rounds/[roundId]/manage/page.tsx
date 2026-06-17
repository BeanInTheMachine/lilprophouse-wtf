'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useRound } from '@/lib/hooks/useApi';
import { useCancelRound, useRoundChainState, useDepositToRound, useSetWinners, useApproveToken, useDepositTokenToRound, useApproveERC721, useApproveERC1155, useDepositERC721, useDepositERC1155 } from '@/lib/hooks/useOnChain';
import { useBalance, useReadContract } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { useWalletTokens, type WalletErc20, type WalletErc721, type WalletErc1155 } from '@/lib/hooks/useWalletTokens';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import InputFormGroup from '@/components/ui/InputFormGroup';
import LoadingIndicator from '@/components/ui/LoadingIndicator';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import RewardsDisplay from '@/components/round/RewardsDisplay';

const ERC20_SYM_ABI = parseAbi(['function symbol() view returns (string)']);
const ERC20_DEC_ABI = parseAbi(['function decimals() view returns (uint8)']);
const ERC20_BAL_ABI = parseAbi(['function balanceOf(address) view returns (uint256)']);

function NftDepositSection({ roundAddress }: { roundAddress: string }) {
  const { address: wallet } = useAccount();
  const { data: tokens, loading: tokensLoading, error: tokensError } = useWalletTokens(wallet);
  const { approve: approve721, isPending: approving721 } = useApproveERC721();
  const { setApprovalForAll, isPending: approving1155 } = useApproveERC1155();
  const { depositERC721, isPending: depositing721 } = useDepositERC721();
  const { depositERC1155, isPending: depositing1155 } = useDepositERC1155();

  const [selectedNft, setSelectedNft] = useState<{ address: string; tokenId: string; isErc1155: boolean } | null>(null);
  const [erc1155Amount, setErc1155Amount] = useState('1');
  const [status, setStatus] = useState('');
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [depositHash, setDepositHash] = useState<`0x${string}` | null>(null);
  const [showManual, setShowManual] = useState(false);

  const [manualAddress, setManualAddress] = useState('');
  const [manualTokenId, setManualTokenId] = useState('');
  const [manualType, setManualType] = useState<'ERC721' | 'ERC1155'>('ERC721');
  const [manualAmount, setManualAmount] = useState('1');

  const validManualAddr = (manualAddress.match(/^0x[a-fA-F0-9]{40}$/) ? manualAddress as Address : undefined);
  const manualTokenIdNum = parseInt(manualTokenId, 10);
  const manualAmountNum = parseInt(manualAmount, 10) || 1;

  const { data: approveReceipt } = useWaitForTransactionReceipt({ hash: approveHash ?? undefined });
  const { data: depositReceipt } = useWaitForTransactionReceipt({ hash: depositHash ?? undefined });

  const allNfts: { address: string; tokenId: string; isErc1155: boolean; name: string; symbol: string; amount?: number }[] = [
    ...(tokens?.erc721s ?? []).map((n: WalletErc721) => ({ address: n.address, tokenId: n.tokenId, isErc1155: false, name: n.name, symbol: n.symbol })),
    ...(tokens?.erc1155s ?? []).map((n: WalletErc1155) => ({ address: n.address, tokenId: n.tokenId, isErc1155: true, name: n.name, symbol: n.symbol, amount: n.value })),
  ];

  useEffect(() => {
    if (!approveReceipt || status !== 'approving') return;
    setStatus('depositing');
    const nft = selectedNft;
    if (!nft) { setStatus(''); return; }
    const addr = nft.address as Address;
    const tid = parseInt(nft.tokenId, 10);
    if (isNaN(tid)) { setStatus(''); return; }
    (async () => {
      try {
        if (nft.isErc1155) {
          const amt = parseInt(erc1155Amount, 10) || 1;
          const hash = await depositERC1155(roundAddress, addr, BigInt(tid), BigInt(amt));
          setDepositHash(hash);
        } else {
          const hash = await depositERC721(roundAddress, addr, BigInt(tid));
          setDepositHash(hash);
        }
      } catch { setStatus(''); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveReceipt]);

  useEffect(() => {
    if (depositReceipt && status === 'depositing') {
      setStatus('confirmed');
      setSelectedNft(null);
      setErc1155Amount('1');
    }
  }, [depositReceipt, status]);

  const selectedAddr = selectedNft?.address as Address | undefined;
  const selectedTokenId = selectedNft ? parseInt(selectedNft.tokenId, 10) : NaN;
  const selectedIs1155 = selectedNft?.isErc1155 ?? false;
  const selectedAmount = parseInt(erc1155Amount, 10) || 1;

  /* Manual approve → deposit auto chain */
  useEffect(() => {
    if (!approveReceipt || status !== 'manual-approving' || !validManualAddr || isNaN(manualTokenIdNum)) return;
    setStatus('manual-depositing');
    (async () => {
      try {
        if (manualType === 'ERC721') {
          const hash = await depositERC721(roundAddress, validManualAddr, BigInt(manualTokenIdNum));
          setDepositHash(hash);
        } else {
          const hash = await depositERC1155(roundAddress, validManualAddr, BigInt(manualTokenIdNum), BigInt(manualAmountNum));
          setDepositHash(hash);
        }
      } catch { setStatus(''); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveReceipt, status]);

  useEffect(() => {
    if (depositReceipt && status === 'manual-depositing') {
      setStatus('confirmed');
      setManualAddress('');
      setManualTokenId('');
      setManualAmount('1');
    }
  }, [depositReceipt, status]);

  return (
    <>
      <p className="text-sm text-brand-gray mb-4">
        Deposit NFTs as round rewards.
      </p>

      {tokensLoading && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-brand-gray">Scanning your wallet...</p>
        </div>
      )}

      {tokensError && !tokensLoading && allNfts.length === 0 && (
        <div className="mb-4 p-3 bg-brand-yellow-hint border border-brand-yellow-semi-transparent rounded-xl text-sm text-brand-yellow">
          {tokensError}. Enter NFT details manually below.
        </div>
      )}

      {!tokensLoading && !tokensError && allNfts.length === 0 && wallet && (
        <p className="text-sm text-brand-gray mb-4">No NFTs found in your wallet.</p>
      )}

      {allNfts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">NFTs in your wallet</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {allNfts.map((nft, i) => {
              const isSelected = selectedNft?.address === nft.address && selectedNft?.tokenId === nft.tokenId;
              return (
                <button
                  key={`${nft.address}-${nft.tokenId}-${i}`}
                  onClick={() => {
                    setSelectedNft({ address: nft.address, tokenId: nft.tokenId, isErc1155: nft.isErc1155 });
                    setShowManual(false);
                    setStatus('');
                    setApproveHash(null);
                    setDepositHash(null);
                  }}
                  className={`p-2 rounded-xl text-left text-xs border transition-colors ${
                    isSelected
                      ? 'border-brand-purple bg-brand-purple-hint'
                      : 'border-border-light bg-surface-dark hover:border-brand-purple'
                  }`}
                >
                  <p className="font-bold text-brand-black truncate">{nft.name || nft.symbol || 'NFT'}</p>
                  <p className="text-brand-gray">#{nft.tokenId}</p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    nft.isErc1155 ? 'bg-brand-yellow-hint text-brand-yellow' : 'bg-brand-purple-hint text-brand-purple'
                  }`}>
                    {nft.isErc1155 ? 'ERC1155' : 'ERC721'}
                  </span>
                  {nft.isErc1155 && nft.amount && <span className="text-brand-gray ml-1">x{nft.amount}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected NFT deposit flow */}
      {selectedNft && selectedAddr && !isNaN(selectedTokenId) && (
        <div className="mb-4 p-3 bg-surface-dark rounded-xl">
          <p className="text-sm font-bold text-brand-black mb-1">
            {selectedNft.isErc1155 ? 'ERC1155' : 'ERC721'} #{selectedNft.tokenId}
          </p>
          {selectedIs1155 && (
            <InputFormGroup
              label="Amount"
              name="erc1155Amount"
              value={erc1155Amount}
              onChange={(e) => setErc1155Amount(e.target.value)}
              placeholder="1"
              className="mb-2"
            />
          )}
          <Button
            onClick={async () => {
              if (!selectedAddr || isNaN(selectedTokenId)) return;
              setStatus('approving');
              try {
                if (selectedIs1155) {
                  const hash = await setApprovalForAll(selectedAddr, roundAddress, true);
                  setApproveHash(hash);
                } else {
                  const hash = await approve721(selectedAddr, roundAddress, BigInt(selectedTokenId));
                  setApproveHash(hash);
                }
              } catch { setStatus(''); }
            }}
            disabled={approving721 || approving1155 || depositing721 || depositing1155 || status === 'approving' || status === 'depositing' || (selectedIs1155 && selectedAmount <= 0)}
          >
            {status === 'approving' ? 'Approving...' :
             status === 'depositing' ? 'Depositing...' :
             `Deposit ${selectedIs1155 ? 'ERC1155' : 'ERC721'}`}
          </Button>
        </div>
      )}

      {status === 'approving' && <p className="text-sm text-brand-purple mb-3">Awaiting approval confirmation...</p>}
      {status === 'depositing' && <p className="text-sm text-brand-purple mb-3">Transaction pending...</p>}
      {status === 'confirmed' && <p className="text-sm text-brand-green mb-3">NFT deposited successfully.</p>}

      {/* Manual entry toggle */}
      {!showManual && (
        <button onClick={() => { setShowManual(true); setSelectedNft(null); }}
          className="text-xs text-brand-purple font-bold hover:underline mb-3">
          + Enter NFT details manually
        </button>
      )}

      {showManual && (
        <>
          <div className="flex gap-2 mb-3">
            {(['ERC721', 'ERC1155'] as const).map((t) => (
              <button key={t} onClick={() => setManualType(t)}
                className={`px-3 py-1 rounded-[10px] text-xs font-bold ${manualType === t ? 'bg-brand-purple text-white' : 'bg-surface-dark text-brand-gray'}`}>
                {t}
              </button>
            ))}
          </div>
          <InputFormGroup label="NFT Contract Address" name="manualAddress" value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)} placeholder="0x..." className="mb-3" />
          <InputFormGroup label="Token ID" name="manualTokenId" value={manualTokenId}
            onChange={(e) => setManualTokenId(e.target.value)} placeholder="1" className="mb-3" />
          {manualType === 'ERC1155' && (
            <InputFormGroup label="Amount" name="manualAmount" value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)} placeholder="1" className="mb-3" />
          )}
          {validManualAddr && !isNaN(manualTokenIdNum) && (
            <div className="flex gap-3 items-end mb-3">
              <Button onClick={async () => {
                if (!roundAddress || !validManualAddr || isNaN(manualTokenIdNum)) return;
                setStatus('manual-approving');
                try {
                  if (manualType === 'ERC721') {
                    const hash = await approve721(validManualAddr, roundAddress, BigInt(manualTokenIdNum));
                    setApproveHash(hash);
                  } else {
                    const hash = await setApprovalForAll(validManualAddr, roundAddress, true);
                    setApproveHash(hash);
                  }
                } catch { setStatus(''); }
              }} disabled={(manualType === 'ERC721' ? approving721 : approving1155) || status === 'manual-approving' || status === 'manual-depositing'}>
                {status === 'manual-approving' ? 'Approving...' :
                 status === 'manual-depositing' ? 'Depositing...' : `Deposit ${manualType}`}
              </Button>
            </div>
          )}
          {status === 'manual-approving' && <p className="text-sm text-brand-purple mb-3">Awaiting approval...</p>}
          {status === 'manual-depositing' && <p className="text-sm text-brand-purple mb-3">Depositing...</p>}
          {status === 'confirmed' && <p className="text-sm text-brand-green mb-3">NFT deposited successfully.</p>}
        </>
      )}
    </>
  );
}

function Erc20DepositSection({ roundAddress }: { roundAddress: string }) {
  const { address: wallet } = useAccount();
  const { data: tokens, loading: tokensLoading, error: tokensError } = useWalletTokens(wallet);
  const { approve, isPending: approving } = useApproveToken();
  const { depositToken, isPending: depositingToken } = useDepositTokenToRound();

  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [depositHash, setDepositHash] = useState<`0x${string}` | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const walletErc20s = tokens?.erc20s ?? [];

  const validToken = (tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)
    ? (tokenAddress as Address)
    : undefined) as Address | undefined;

  const { data: symbol } = useReadContract({
    address: validToken,
    abi: ERC20_SYM_ABI,
    functionName: 'symbol',
    query: { enabled: !!validToken },
  });

  const { data: decimals } = useReadContract({
    address: validToken,
    abi: ERC20_DEC_ABI,
    functionName: 'decimals',
    query: { enabled: !!validToken },
  });

  const { data: contractBal } = useReadContract({
    address: validToken,
    abi: ERC20_BAL_ABI,
    functionName: 'balanceOf',
    args: [roundAddress as Address],
    query: { enabled: !!validToken },
  });

  const { data: approveReceipt } = useWaitForTransactionReceipt({ hash: approveHash ?? undefined });
  const { data: depositReceipt } = useWaitForTransactionReceipt({ hash: depositHash ?? undefined });

  useEffect(() => {
    if (!approveReceipt || tokenStatus !== 'approving' || !validToken || !roundAddress || !tokenAmount) return;
    setTokenStatus('depositing');
    const doDeposit = async () => {
      const decimalsNum = Number(decimals) || 18;
      const amountWei = BigInt(Math.floor(parseFloat(tokenAmount) * 10 ** decimalsNum));
      if (amountWei <= 0n) { setTokenStatus(''); return; }
      try {
        const hash = await depositToken(roundAddress, validToken, amountWei);
        setDepositHash(hash);
        setTokenAmount('');
      } catch {
        setTokenStatus('');
      }
    };
    doDeposit();
  }, [approveReceipt, tokenStatus, validToken, roundAddress, tokenAmount, depositToken, decimals]);

  useEffect(() => {
    if (depositReceipt && tokenStatus === 'depositing') {
      setTokenStatus('confirmed');
    }
  }, [depositReceipt, tokenStatus]);

  const decimalsNum = Number(decimals) || 18;

  return (
    <>
      <p className="text-sm text-brand-gray mb-4">
        Deposit ERC20 tokens to fund this round.
      </p>

      {tokensLoading && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-brand-gray">Scanning your wallet...</p>
        </div>
      )}

      {tokensError && !tokensLoading && walletErc20s.length === 0 && (
        <div className="mb-4 p-3 bg-brand-yellow-hint border border-brand-yellow-semi-transparent rounded-xl text-sm text-brand-yellow">
          {tokensError}. Enter a token address manually below.
        </div>
      )}

      {tokens?.source === 'onchain-fallback' && walletErc20s.length > 0 && (
        <p className="text-xs text-brand-gray mb-2">Showing common Base tokens from your wallet</p>
      )}

      {!tokensLoading && !tokensError && walletErc20s.length === 0 && wallet && (
        <p className="text-sm text-brand-gray mb-4">No ERC20 tokens found in your wallet.</p>
      )}

      {walletErc20s.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-brand-gray uppercase tracking-wider mb-2">Tokens in your wallet</p>
          <div className="flex flex-wrap gap-2">
            {walletErc20s.map((t) => (
              <button
                key={t.address}
                onClick={() => { setTokenAddress(t.address); setShowManualInput(false); }}
                className={`px-3 py-1.5 rounded-[10px] text-sm font-bold transition-colors ${
                  tokenAddress === t.address
                    ? 'bg-brand-purple text-white'
                    : 'bg-surface-dark text-brand-gray hover:text-brand-black'
                }`}
              >
                {t.symbol || t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showManualInput && !tokenAddress && (
        <button
          onClick={() => setShowManualInput(true)}
          className="text-xs text-brand-purple font-bold hover:underline mb-3"
        >
          + Enter token address manually
        </button>
      )}

      {(showManualInput || tokenAddress) && (
        <InputFormGroup
          label="Token Address"
          name="tokenAddress"
          value={tokenAddress}
          onChange={(e) => { setTokenAddress(e.target.value); }}
          placeholder="0x..."
          className="mb-3"
        />
      )}
      {symbol && (
        <p className="text-xs text-brand-green mb-3">
          Token: {symbol}
          {contractBal !== undefined && (
            <> | Contract balance: {Number(contractBal) / 10 ** decimalsNum}</>
          )}
        </p>
      )}

      {validToken && (
        <>
          <div className="flex gap-3 items-end mb-3">
            <InputFormGroup
              label={`Amount (${symbol || 'ERC20'})`}
              name="tokenAmount"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1"
            />
            <Button
              onClick={async () => {
                if (!roundAddress || !tokenAmount || !validToken) return;
                const amountWei = BigInt(Math.floor(parseFloat(tokenAmount) * 10 ** decimalsNum));
                if (amountWei <= 0n) return;
                try {
                  setTokenStatus('approving');
                  const hash = await approve(validToken, roundAddress, amountWei);
                  setApproveHash(hash);
                } catch {
                  setTokenStatus('');
                  return;
                }
              }}
              disabled={approving || !tokenAmount || tokenStatus === 'approving' || tokenStatus === 'depositing'}
            >
              {tokenStatus === 'approving' ? 'Approving...' :
               tokenStatus === 'depositing' ? 'Depositing...' : `Deposit ${symbol || 'ERC20'}`}
            </Button>
          </div>
          {tokenStatus === 'approving' && (
            <p className="text-sm text-brand-purple mb-3">Awaiting approval confirmation...</p>
          )}
          {tokenStatus === 'depositing' && (
            <p className="text-sm text-brand-purple mb-3">Transaction pending...</p>
          )}
          {tokenStatus === 'confirmed' && (
            <p className="text-sm text-brand-green mb-3">Token deposit confirmed.</p>
          )}
        </>
      )}
    </>
  );
}

export default function RoundManagerPage() {
  const params = useParams<{ roundId: string }>();
  const roundId = parseInt(params.roundId, 10);
  const router = useRouter();
  const { address } = useAccount();
  const { data: round, loading, error: fetchError } = useRound(roundId);
  const chainAddress = (round?.contractAddress as Address | undefined) ?? '0x0000000000000000000000000000000000000000';
  const { state: chainState, owner: chainOwner } = useRoundChainState(chainAddress);

  const { cancelRound, isPending: cancelling } = useCancelRound();
  const { setWinners, isPending: settingWinners } = useSetWinners();
  const { depositEth, isPending: depositing } = useDepositToRound();
  const [depositAmount, setDepositAmount] = useState('');
  const [lastDepositAmount, setLastDepositAmount] = useState('');
  const [depositStatus, setDepositStatus] = useState('');
  const [depositType, setDepositType] = useState<'ETH' | 'ERC20' | 'NFT'>('ETH');

  const { data: roundBalance, refetch: refetchBalance } = useBalance({
    address: chainAddress as Address,
  });
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [depositTxHash, setDepositTxHash] = useState<`0x${string}` | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionLabel, setActionLabel] = useState<string | null>(null);

  const { isLoading: waiting } = useWaitForTransactionReceipt({ hash: txHash ?? undefined });
  const { data: depositReceipt } = useWaitForTransactionReceipt({ hash: depositTxHash ?? undefined });

  useEffect(() => {
    if (depositReceipt && depositStatus === 'confirming') {
      setDepositStatus('confirmed');
      setLastDepositAmount('');
      refetchBalance();
    }
  }, [depositReceipt, depositStatus, refetchBalance]);

  if (loading) return <LoadingIndicator />;
  if (fetchError || !round) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-brand-black mb-2">Round not found</h2>
        <Link href="/app" className="text-brand-purple font-bold hover:underline">&larr; Browse rounds</Link>
      </div>
    );
  }

  const isOwner = chainOwner ? chainOwner.toLowerCase() === address?.toLowerCase() : false;

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this round? This cannot be undone.')) return;
    if (!round?.contractAddress) {
      setActionError('Round not deployed on-chain');
      return;
    }
    setActionLabel('cancel');
    setActionError('');
    try {
      const hash = await cancelRound(round.contractAddress);
      setTxHash(hash);
      router.push(`/rounds/${roundId}`);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to cancel round');
      setActionLabel(null);
    }
  }

  async function handleFinalize() {
    if (!confirm('Finalize this round? Winners will be selected.')) return;
    if (!round?.contractAddress) {
      setActionError('Round not deployed on-chain');
      return;
    }
    setActionLabel('finalize');
    setActionError('');
    try {
      const hash = await setWinners(round.contractAddress, [], []);
      setTxHash(hash);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to finalize round');
      setActionLabel(null);
    }
  }

  const isBusy = cancelling || settingWinners || waiting;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href={`/rounds/${roundId}`} className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6">
        &larr; Back to round
      </Link>

      <h1 className="font-londrina text-3xl text-brand-black mb-2">Manage Round</h1>
      <p className="text-brand-gray mb-8">{round.title}</p>

      {actionError && (
        <div className="bg-brand-red-hint border border-brand-red-semi-transparent rounded-xl px-4 py-3 text-sm font-medium text-brand-red mb-6">
          {actionError}
        </div>
      )}

      <div className="grid gap-6">
        {/* Round Info */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Round Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Status', round.state.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())],
              ['Type', round.type],
              ['Funding', `${String(round.fundingAmount)} ${round.currencyType ?? ''}`],
              ['Winners', String(round.numWinners)],
              ['Proposals', String(round.proposals?.length ?? 0)],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-brand-gray">{label}</span>
                <p className="font-bold text-brand-black">{value}</p>
              </div>
            ))}
            {round.contractAddress && (
              <div className="col-span-2">
                <span className="text-brand-gray">Contract</span>
                <p className="font-bold text-brand-black font-mono text-xs break-all">{round.contractAddress}</p>
              </div>
            )}
          </div>
        </Card>

        {/* On-chain state */}
        {round.contractAddress && chainState !== undefined && (
          <Card className="p-6">
            <h3 className="font-bold text-lg text-brand-black mb-4">On-Chain State</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['State', String(chainState)],
                ['Owner', chainOwner ? `${chainOwner.slice(0, 6)}...${chainOwner.slice(-4)}` : 'Unknown'],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="text-brand-gray">{label}</span>
                  <p className="font-bold text-brand-black">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Deposit */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Deposit Assets</h3>

          <div className="flex gap-2 mb-4">
            {(['ETH', 'ERC20', 'NFT'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setDepositType(type)}
                className={`px-4 py-1.5 rounded-[10px] text-sm font-bold transition-colors ${
                  depositType === type
                    ? 'bg-brand-purple text-white'
                    : 'bg-surface-dark text-brand-gray hover:text-brand-black'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {depositType === 'ETH' ? (
            <>
              <p className="text-sm text-brand-gray mb-4">
                {round.contractAddress
                  ? `Fund this round by depositing ETH. Current balance: ${roundBalance?.formatted ?? '0'} ${roundBalance?.symbol ?? 'ETH'}.`
                  : 'Deposit assets after the round is deployed on-chain.'}
              </p>
              <div className="flex gap-3 items-end">
                <InputFormGroup
                  label="Amount (ETH)"
                  name="deposit"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                />
                <Button
                  onClick={async () => {
                    if (!round?.contractAddress || !depositAmount) return;
                    setDepositStatus('depositing');
                    try {
                      const hash = await depositEth(round.contractAddress, depositAmount);
                      setDepositTxHash(hash);
                      setLastDepositAmount(depositAmount);
                      setDepositAmount('');
                      setDepositStatus('confirming');
                    } catch {
                      setDepositStatus('');
                    }
                  }}
                  disabled={depositing || !depositAmount || !round?.contractAddress || depositStatus === 'confirming'}
                >
                  {depositStatus === 'confirming' ? 'Confirming...' : depositing ? 'Sending...' : 'Deposit ETH'}
                </Button>
              </div>
              {depositStatus === 'confirming' && (
                <p className="text-sm text-brand-purple mt-3">Transaction pending. Waiting for confirmation...</p>
              )}
              {depositStatus === 'confirmed' && (
                <p className="text-sm text-brand-green mt-3">Deposit confirmed. Balance and funding updated.</p>
              )}
              {depositStatus === 'sent' && (
                <p className="text-sm text-brand-green mt-3">Transaction sent. Balance will update once confirmed.</p>
              )}
            </>
          ) : depositType === 'ERC20' ? (
            round.contractAddress ? (
              <Erc20DepositSection roundAddress={round.contractAddress} />
            ) : (
              <p className="text-sm text-brand-gray">Deposit assets after the round is deployed on-chain.</p>
            )
          ) : (
            round.contractAddress ? (
              <NftDepositSection roundAddress={round.contractAddress} />
            ) : (
              <p className="text-sm text-brand-gray">Deposit assets after the round is deployed on-chain.</p>
            )
          )}

          {depositType === 'NFT' && round.contractAddress && (
            <RewardsDisplay roundAddress={round.contractAddress} />
          )}

          <p className="text-xs text-brand-gray mt-3">
            Deposits go directly to the round contract. Anyone can fund a round.
          </p>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <h3 className="font-bold text-lg text-brand-black mb-4">Actions</h3>
          <div className="flex flex-col gap-3">
            {(round.state === 'ACCEPTING_PROPOSALS' || round.state === 'VOTING') && (
              <Button variant="outline" onClick={handleCancel} disabled={isBusy} className="border-brand-red text-brand-red hover:bg-brand-red-hint">
                {actionLabel === 'cancel' && waiting ? 'Confirming...' : actionLabel === 'cancel' ? 'Signing...' : 'Cancel Round'}
              </Button>
            )}
            {(round.state === 'VOTING' || round.state === 'COMPLETED') && (
              <Button onClick={handleFinalize} disabled={isBusy}>
                {actionLabel === 'finalize' && waiting ? 'Confirming...' : actionLabel === 'finalize' ? 'Signing...' : 'Finalize Round'}
              </Button>
            )}
            {(round.state === 'COMPLETED' || round.state === 'CANCELLED') && (
              <p className="text-sm text-brand-gray text-center py-2">No actions available for completed or cancelled rounds.</p>
            )}
            {!isOwner && (
              <p className="text-xs text-brand-gray text-center">Only the round owner can perform actions.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
