'use client';

import { useReadContract } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { LIL_ROUND_ABI } from '@/lib/contracts/abis';
import { useState, useEffect } from 'react';

const ERC721_META_ABI = parseAbi([
  'function name() view returns (string)',
  'function tokenURI(uint256) view returns (string)',
]);

const ERC1155_URI_ABI = parseAbi([
  'function uri(uint256) view returns (string)',
  'function name() view returns (string)',
]);

interface RawNFT {
  nftContract: string;
  tokenId: bigint;
  amount: bigint;
  isERC1155: boolean;
}

function NFTCard({ nft }: { nft: RawNFT }) {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);
  const [loading, setLoading] = useState(true);

  const { data: contractName } = useReadContract({
    address: nft.nftContract as Address,
    abi: nft.isERC1155 ? ERC1155_URI_ABI : ERC721_META_ABI,
    functionName: 'name',
    query: { enabled: !!nft.nftContract },
  });

  const { data: tokenUri } = useReadContract({
    address: nft.nftContract as Address,
    abi: nft.isERC1155 ? ERC1155_URI_ABI : ERC721_META_ABI,
    functionName: nft.isERC1155 ? 'uri' : 'tokenURI',
    args: [nft.tokenId],
    query: { enabled: !!nft.nftContract },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!tokenUri || !nft.nftContract) return;
      try {
        let uriStr = tokenUri as string;
        let json: any;

        if (uriStr.startsWith('data:application/json;base64,')) {
          json = JSON.parse(atob(uriStr.replace('data:application/json;base64,', '')));
        } else {
          const url = uriStr.replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');
          const res = await fetch(url);
          json = await res.json();
        }

        if (cancelled) return;
        const img = (json.image || '').replace(/^ipfs:\/\//, 'https://ipfs.io/ipfs/');
        setName(json.name || (contractName as string) || '');
        setImageUrl(img || null);
      } catch {
        if (!cancelled) setName((contractName as string) || '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (tokenUri) {
      load();
    } else if (contractName) {
      setName(contractName as string);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [tokenUri, contractName, nft.nftContract]);

  return (
    <div className="bg-surface-dark rounded-xl p-3 flex items-center gap-3">
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-border-light flex-shrink-0 flex items-center justify-center">
        {loading ? (
          <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
        ) : imageUrl && !imgErr ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="text-brand-purple font-londrina text-xs">{name.charAt(0) || '?'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-brand-black truncate">{loading ? 'Loading...' : name || 'Unknown NFT'}</p>
        <p className="text-xs text-brand-gray font-mono truncate">{nft.nftContract.slice(0, 6)}...{nft.nftContract.slice(-4)}</p>
        {nft.isERC1155 && (
          <p className="text-xs text-brand-purple">&times;{Number(nft.amount)}</p>
        )}
      </div>
    </div>
  );
}

export default function RewardsDisplay({ roundAddress }: { roundAddress: string }) {
  const { data: rawNfts } = useReadContract({
    address: roundAddress as Address,
    abi: LIL_ROUND_ABI,
    functionName: 'getAllDepositedNFTs',
    query: { enabled: !!roundAddress },
  });

  const nfts = (rawNfts as any[] | undefined)?.map((n: any) => ({
    nftContract: n.nftContract as string,
    tokenId: n.tokenId as bigint,
    amount: n.amount as bigint,
    isERC1155: n.isERC1155 as boolean,
  })) ?? [];

  if (!roundAddress || nfts.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="font-bold text-sm text-brand-black mb-2">NFT Rewards Pool</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {nfts.map((nft, i) => (
          <NFTCard key={i} nft={nft} />
        ))}
      </div>
    </div>
  );
}
