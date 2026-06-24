'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useRound } from '@/lib/hooks/useApi';
import { useCancelRound, useRoundChainState, useDepositToRound, useFinalizeRound, useClaimAward, useWinnerInfo, useApproveToken, useDepositTokenToRound, useApproveERC721, useApproveERC1155, useDepositERC721, useDepositERC1155 } from '@/lib/hooks/useOnChain';
import { useBalance, useReadContract } from 'wagmi';
import { type Address, parseAbi } from 'viem';
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
  const { approve: approve721, isPending: approving721 } = useApproveERC721();
  const { setApprovalForAll, isPending: approving1155 } = useApproveERC1155();
  const { depositERC721, isPending: depositing721 } = useDepositERC721();
  const { depositERC1155, isPending: depositing1155 } = useDepositERC1155();

  const [nftType, setNftType] = useState<'ERC721' | 'ERC1155'>('ERC721');
  const [nftAddress, setNftAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [nftAmount, setNftAmount] = useState('1');
  const [status, setStatus] = useState('');
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [depositHash, setDepositHash] = useState<`0x${string}` | null>(null);

  const validAddr = (nftAddress.match(/^0x[a-fA-F0-9]{40}$/) ? nftAddress as Address : undefined);
  const tokenIdNum = parseInt(tokenId, 10);
  const amountNum = parseInt(nftAmount, 10) || 1;

  const { data: approveReceipt } = useWaitForTransactionReceipt({ hash: approveHash ?? undefined });
  const { data: depositReceipt } = useWaitForTransactionReceipt({ hash: depositHash ?? undefined });

  useEffect(() => {
    if (!approveReceipt || status !== 'approving' || !validAddr || isNaN(tokenIdNum)) return;
    setStatus('depositing');
    (async () => {
      try {
        if (nftType === 'ERC721') {
          const hash = await depositERC721(roundAddress, validAddr, BigInt(tokenIdNum));
          setDepositHash(hash);
        } else {
          if (amountNum <= 0) { setStatus(''); return; }
          const hash = await depositERC1155(roundAddress, validAddr, BigInt(tokenIdNum), BigInt(amountNum));
          setDepositHash(hash);
        }
      } catch { setStatus(''); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveReceipt]);

  useEffect(() => {
    if (depositReceipt && status === 'depositing') {
      setStatus('confirmed');
      setNftAddress('');
      setTokenId('');
      setNftAmount('1');
    }
  }, [depositReceipt, status]);

  return (
    <>
      <p className="text-sm text-brand-gray mb-4">
        Deposit NFTs as round rewards.
      </p>

      <div className="flex gap-2 mb-3">
        {(['ERC721', 'ERC1155'] as const).map((t) => (
          <button key={t} onClick={() => setNftType(t)}
            className={`px-3 py-1 rounded-[10px] text-xs font-bold ${nftType === t ? 'bg-brand-purple text-white' : 'bg-surface-dark text-brand-gray'}`}>
            {t}
          </button>
        ))}
      </div>

      <InputFormGroup label="NFT Contract Address" name="nftAddress" value={nftAddress}
        onChange={(e) => setNftAddress(e.target.value)} placeholder="0x..." className="mb-3" />
      <InputFormGroup label="Token ID" name="tokenId" value={tokenId}
        onChange={(e) => setTokenId(e.target.value)} placeholder="1" className="mb-3" />

      {nftType === 'ERC1155' && (
        <InputFormGroup label="Amount" name="nftAmount" value={nftAmount}
          onChange={(e) => setNftAmount(e.target.value)} placeholder="1" className="mb-3" />
      )}

      {validAddr && !isNaN(tokenIdNum) && (
        <div className="flex gap-3 items-end mb-3">
          <Button onClick={async () => {
            if (!roundAddress || !validAddr || isNaN(tokenIdNum)) return;
            setStatus('approving');
            try {
              if (nftType === 'ERC721') {
                const hash = await approve721(validAddr, roundAddress, BigInt(tokenIdNum));
                setApproveHash(hash);
              } else {
                if (amountNum <= 0) return;
                const hash = await setApprovalForAll(validAddr, roundAddress, true);
                setApproveHash(hash);
              }
            } catch { setStatus(''); }
          }} disabled={(nftType === 'ERC721' ? approving721 : approving1155) || depositing721 || depositing1155 || status === 'approving' || status === 'depositing'}>
            {status === 'approving' ? 'Approving...' :
             status === 'depositing' ? 'Depositing...' : `Deposit ${nftType}`}
          </Button>
        </div>
      )}
      {status === 'approving' && <p className="text-sm text-brand-purple mb-3">Awaiting approval confirmation...</p>}
      {status === 'depositing' && <p className="text-sm text-brand-purple mb-3">Transaction pending...</p>}
      {status === 'confirmed' && <p className="text-sm text-brand-green mb-3">NFT deposited successfully.</p>}
    </>
  );
}

function Erc20DepositSection({ roundAddress, presetToken }: { roundAddress: string; presetToken?: Address }) {
  const { approve, isPending: approving } = useApproveToken();
  const { depositToken, isPending: depositingToken } = useDepositTokenToRound();

  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null);
  const [depositHash, setDepositHash] = useState<`0x${string}` | null>(null);
  const [showManual, setShowManual] = useState(false);

  const activeToken = (tokenAddress || presetToken || '').match(/^0x[a-fA-F0-9]{40}$/)
    ? (tokenAddress || presetToken) as Address
    : undefined;

  const { data: symbol } = useReadContract({
    address: activeToken,
    abi: ERC20_SYM_ABI,
    functionName: 'symbol',
    query: { enabled: !!activeToken },
  });

  const { data: decimals } = useReadContract({
    address: activeToken,
    abi: ERC20_DEC_ABI,
    functionName: 'decimals',
    query: { enabled: !!activeToken },
  });

  const { data: contractBal } = useReadContract({
    address: activeToken,
    abi: ERC20_BAL_ABI,
    functionName: 'balanceOf',
    args: [roundAddress as Address],
    query: { enabled: !!activeToken },
  });

  const { data: approveReceipt } = useWaitForTransactionReceipt({ hash: approveHash ?? undefined });
  const { data: depositReceipt } = useWaitForTransactionReceipt({ hash: depositHash ?? undefined });

  useEffect(() => {
    if (!approveReceipt || tokenStatus !== 'approving' || !activeToken || !roundAddress || !tokenAmount) return;
    setTokenStatus('depositing');
    const doDeposit = async () => {
      const decimalsNum = Number(decimals) || 18;
      const amountWei = BigInt(Math.floor(parseFloat(tokenAmount) * 10 ** decimalsNum));
      if (amountWei <= 0n) { setTokenStatus(''); return; }
      try {
        const hash = await depositToken(roundAddress, activeToken, amountWei);
        setDepositHash(hash);
        setTokenAmount('');
        setTokenAddress('');
      } catch {
        setTokenStatus('');
      }
    };
    doDeposit();
  }, [approveReceipt, tokenStatus, activeToken, roundAddress, tokenAmount, depositToken, decimals]);

  useEffect(() => {
    if (depositReceipt && tokenStatus === 'depositing') {
      setTokenStatus('confirmed');
    }
  }, [depositReceipt, tokenStatus]);

  const decimalsNum = Number(decimals) || 18;

  async function handleDeposit() {
    if (!roundAddress || !tokenAmount || !activeToken) return;
    const amountWei = BigInt(Math.floor(parseFloat(tokenAmount) * 10 ** decimalsNum));
    if (amountWei <= 0n) return;
    try {
      setTokenStatus('approving');
      const hash = await approve(activeToken, roundAddress, amountWei);
      setApproveHash(hash);
    } catch {
      setTokenStatus('');
    }
  }

  return (
    <>
      <p className="text-sm text-brand-gray mb-4">
        {presetToken ? `Deposit ${symbol || 'ERC20'} to fund this round.` : 'Deposit ERC20 tokens to fund this round.'}
      </p>

      {presetToken ? (
        /* Preset token quick deposit (e.g. USDC) */
        <div className="flex gap-3 items-end">
          <InputFormGroup
            label={`Amount (${symbol || 'ERC20'})`}
            name="tokenAmount"
            value={tokenAmount}
            onChange={(e) => setTokenAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1"
          />
          <Button
            onClick={handleDeposit}
            disabled={approving || !tokenAmount || tokenStatus === 'approving' || tokenStatus === 'depositing'}
          >
            {tokenStatus === 'approving' ? 'Approving...' :
             tokenStatus === 'depositing' ? 'Depositing...' : `Deposit ${symbol || 'ERC20'}`}
          </Button>
        </div>
      ) : (
        /* Manual ERC20 entry */
        <>
          <InputFormGroup
            label="Token Address"
            name="tokenAddress"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            className="mb-3"
          />
          {symbol && tokenAddress && (
            <p className="text-xs text-brand-green mb-3">
              Token: {symbol}
              {contractBal !== undefined && (
                <> | Contract balance: {Number(contractBal) / 10 ** decimalsNum}</>
              )}
            </p>
          )}
          {tokenAddress && activeToken && (
            <div className="flex gap-3 items-end">
              <InputFormGroup
                label={`Amount (${symbol || 'ERC20'})`}
                name="tokenAmount"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1"
              />
              <Button
                onClick={handleDeposit}
                disabled={approving || !tokenAmount || tokenStatus === 'approving' || tokenStatus === 'depositing'}
              >
                {tokenStatus === 'approving' ? 'Approving...' :
                 tokenStatus === 'depositing' ? 'Depositing...' : `Deposit ${symbol || 'ERC20'}`}
              </Button>
            </div>
          )}
        </>
      )}

      {tokenStatus === 'approving' && (
        <p className="text-sm text-brand-purple mb-3 mt-3">Awaiting approval confirmation...</p>
      )}
      {tokenStatus === 'depositing' && (
        <p className="text-sm text-brand-purple mb-3 mt-3">Transaction pending...</p>
      )}
      {tokenStatus === 'confirmed' && (
        <p className="text-sm text-brand-green mb-3 mt-3">Deposit confirmed.</p>
      )}
    </>
  );
}

function WinnerClaimRow({ roundAddress, onChainIndex, title }: { roundAddress: string; onChainIndex: number; title: string }) {
  const { isWinner, isClaimed, loading: infoLoading } = useWinnerInfo(roundAddress, onChainIndex);
  const { claimAward, isPending: claiming, error: claimError } = useClaimAward();
  const [claimHash, setClaimHash] = useState<`0x${string}` | null>(null);
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: claimHash ?? undefined });
  const [claimed, setClaimed] = useState(false);

  if (infoLoading) return null;

  if (claimed || isClaimed) {
    return (
      <p className="text-sm text-brand-green text-center py-2">
        Award claimed for <span className="font-bold">&ldquo;{title}&rdquo;</span>.
      </p>
    );
  }

  if (!isWinner) return null;

  return (
    <div>
      <div className="flex items-center justify-between p-2 bg-brand-purple-hint rounded-lg">
        <span className="text-sm text-brand-black font-medium truncate max-w-[350px]">{title}</span>
        <Button
          onClick={async () => {
            try {
              const hash = await claimAward(roundAddress, onChainIndex);
              setClaimHash(hash);
            } catch { /* error shown below */ }
          }}
          disabled={claiming || confirming}
        >
          {confirming ? 'Confirming...' : claiming ? 'Signing...' : 'Claim Award'}
        </Button>
      </div>
      {claimError && (
        <p className="text-xs text-brand-red mt-1">{claimError}</p>
      )}
    </div>
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
  const { finalizeRound, isPending: finalizing } = useFinalizeRound();
  const { depositEth, isPending: depositing } = useDepositToRound();
  const [depositAmount, setDepositAmount] = useState('');
  const [lastDepositAmount, setLastDepositAmount] = useState('');
  const [depositStatus, setDepositStatus] = useState('');
  const [depositType, setDepositType] = useState<'ETH' | 'USDC' | 'ERC20' | 'NFT'>('ETH');

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

  const userProposals = (round.proposals ?? []).filter((p: any) =>
    p.address && address && p.address.toLowerCase() === address.toLowerCase() && p.onChainIndex !== null && p.onChainIndex !== undefined
  );

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
    if (!round?.contractAddress) {
      setActionError('Round not deployed on-chain');
      return;
    }
    const proposals = round.proposals ?? [];
    if (proposals.length === 0) {
      setActionError('No proposals to finalize');
      return;
    }
    const sorted = [...proposals].sort((a: any, b: any) => b.voteCountFor - a.voteCountFor);
    const winnerIds = sorted.slice(0, round.numWinners).map((p: any) => p.id);

    if (!confirm(`Finalize this round?\n\nWinners will be: ${winnerIds.map((id: number) => {
      const p = proposals.find((pp: any) => pp.id === id);
      return p ? `#${id} "${p.title}" (${p.voteCountFor} votes)` : `#${id}`;
    }).join('\n')}`)) return;

    setActionLabel('finalize');
    setActionError('');
    try {
      const hash = await finalizeRound(round.contractAddress, winnerIds);
      setTxHash(hash);
    } catch (e: any) {
      setActionError(e.message ?? 'Failed to finalize round');
      setActionLabel(null);
    }
  }

  const isBusy = cancelling || finalizing || waiting;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href={`/rounds/${roundId}`} className="inline-flex items-center text-sm font-medium text-brand-gray hover:text-brand-black mb-6">
        &larr; Back to round
      </Link>

      <h1 className="font-londrina text-3xl text-brand-black mb-2">Fund This Round</h1>
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
            {(['ETH', 'USDC', 'ERC20', 'NFT'] as const).map((type) => (
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
          ) : depositType === 'USDC' ? (
            round.contractAddress ? (
              <Erc20DepositSection roundAddress={round.contractAddress} presetToken="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" />
            ) : (
              <p className="text-sm text-brand-gray">Deposit assets after the round is deployed on-chain.</p>
            )
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

          {/* Proposal ranking for finalization */}
          {round.state === 'VOTING' && round.proposals && round.proposals.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-bold text-brand-black mb-2">Proposal Rankings</h4>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {[...round.proposals]
                  .sort((a: any, b: any) => b.voteCountFor - a.voteCountFor)
                  .map((p: any, idx: number) => (
                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                      idx < round.numWinners ? 'bg-brand-purple-hint' : 'bg-surface-dark'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${idx < round.numWinners ? 'text-brand-purple' : 'text-brand-gray'}`}>
                          #{idx + 1}
                        </span>
                        <span className="text-brand-black truncate max-w-[300px]">{p.title}</span>
                      </div>
                      <span className="font-bold text-brand-black">{p.voteCountFor} votes</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {(round.state === 'ACCEPTING_PROPOSALS' || round.state === 'VOTING') && isOwner && (
              <Button variant="outline" onClick={handleCancel} disabled={isBusy} className="border-brand-red text-brand-red hover:bg-brand-red-hint">
                {actionLabel === 'cancel' && waiting ? 'Confirming...' : actionLabel === 'cancel' ? 'Signing...' : 'Cancel Round'}
              </Button>
            )}
            {round.state === 'VOTING' && (
              <Button onClick={handleFinalize} disabled={isBusy}>
                {actionLabel === 'finalize' && waiting ? 'Confirming...' : actionLabel === 'finalize' ? 'Signing...' : 'Finalize Round'}
              </Button>
            )}
            {round.state === 'COMPLETED' && round.contractAddress && (
              <div className="mb-4">
                <h4 className="text-sm font-bold text-brand-black mb-2">Claim Awards</h4>
                {userProposals.length === 0 ? (
                  <p className="text-sm text-brand-gray text-center py-2">No proposals by you in this round.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {userProposals.map((p: any) => (
                      <WinnerClaimRow
                        key={p.id}
                        roundAddress={round.contractAddress!}
                        onChainIndex={p.onChainIndex}
                        title={p.title}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {round.state === 'CANCELLED' && (
              <p className="text-sm text-brand-gray text-center py-2">No actions available for cancelled rounds.</p>
            )}
            {round.state === 'VOTING' && (
              <p className="text-xs text-brand-gray text-center">Anyone can finalize the round once voting ends.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
