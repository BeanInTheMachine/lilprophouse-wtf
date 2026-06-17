'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, erc20Abi, type Address } from 'viem';
import { base } from 'viem/chains';

export interface WalletErc20 {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  value: number;
}

export interface WalletErc721 {
  address: string;
  name: string;
  symbol: string;
  tokenId: string;
}

export interface WalletErc1155 {
  address: string;
  name: string;
  symbol: string;
  tokenId: string;
  value: number;
}

export interface WalletTokens {
  erc20s: WalletErc20[];
  erc721s: WalletErc721[];
  erc1155s: WalletErc1155[];
  source: 'blockscout' | 'onchain-fallback';
}

const BLOCKSCOUT_BASE = 'https://base.blockscout.com/api/v2';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
});

const COMMON_BASE_TOKENS: { symbol: string; address: Address }[] = [
  { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' },
  { symbol: 'DAI',  address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' },
  { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006' },
  { symbol: 'cbETH', address: '0x2Ae3F1Ec7F1F5012CFEab7675bF98464dC3ef657' },
  { symbol: 'cbBTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' },
  { symbol: 'EURC', address: '0x60a3E35Cc302bFA44F4a1fd6a17F7789A7e23A5d' },
];

async function fetchBlockscout(url: string): Promise<any[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Blockscout returned ${res.status}`);
  const data = await res.json();
  return data.items ?? [];
}

async function fetchWithRetry(url: string): Promise<any[]> {
  try {
    return await fetchBlockscout(url);
  } catch {
    await new Promise((r) => setTimeout(r, 1500));
    return await fetchBlockscout(url);
  }
}

async function scanCommonErc20s(address: string): Promise<WalletErc20[]> {
  const balances = await client.multicall({
    contracts: COMMON_BASE_TOKENS.map((t) => ({
      address: t.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as Address],
    })),
  });

  const tokens: WalletErc20[] = [];
  for (let i = 0; i < COMMON_BASE_TOKENS.length; i++) {
    const bal = balances[i]?.result;
    if (bal && bal > 0n) {
      tokens.push({
        address: COMMON_BASE_TOKENS[i].address,
        name: COMMON_BASE_TOKENS[i].symbol,
        symbol: COMMON_BASE_TOKENS[i].symbol,
        decimals: 18,
        balance: bal.toString(),
        value: Number(bal),
      });
    }
  }
  return tokens;
}

export function useWalletTokens(address?: string) {
  const [state, setState] = useState<{
    data: WalletTokens | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (!address) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    (async () => {
      let erc20s: WalletErc20[] = [];
      let erc721s: WalletErc721[] = [];
      let erc1155s: WalletErc1155[] = [];
      let source: 'blockscout' | 'onchain-fallback' = 'blockscout';
      let blockscoutFailed = false;

      try {
        const [erc20sRaw, erc721sRaw, erc1155sRaw] = await Promise.all([
          fetchWithRetry(`${BLOCKSCOUT_BASE}/addresses/${address}/tokens?type=ERC-20`),
          fetchWithRetry(`${BLOCKSCOUT_BASE}/addresses/${address}/nft?type=ERC-721`),
          fetchWithRetry(`${BLOCKSCOUT_BASE}/addresses/${address}/nft?type=ERC-1155`),
        ]);

        erc20s = (erc20sRaw ?? []).map((t: any) => ({
          address: t.token?.address_hash ?? t.token?.address ?? '',
          name: t.token?.name ?? '',
          symbol: t.token?.symbol ?? '',
          decimals: Number(t.token?.decimals ?? 18),
          balance: t.value ?? '0',
          value: Number(t.value ?? 0),
        })).filter((t: WalletErc20) => t.value > 0);

        erc721s = (erc721sRaw ?? []).map((t: any) => ({
          address: t.token?.address_hash ?? t.token?.address ?? '',
          name: t.token?.name ?? '',
          symbol: t.token?.symbol ?? '',
          tokenId: String(t.id ?? t.token_id ?? ''),
        }));

        erc1155s = (erc1155sRaw ?? []).map((t: any) => ({
          address: t.token?.address_hash ?? t.token?.address ?? '',
          name: t.token?.name ?? '',
          symbol: t.token?.symbol ?? '',
          tokenId: String(t.id ?? t.token_id ?? ''),
          value: Number(t.value ?? 1),
        })).filter((t: WalletErc1155) => t.value > 0);
      } catch {
        blockscoutFailed = true;
        source = 'onchain-fallback';
        try {
          erc20s = await scanCommonErc20s(address);
        } catch {
          /* fallback also failed */
        }
      }

      if (cancelled) return;

      if (blockscoutFailed && erc20s.length === 0 && erc721s.length === 0 && erc1155s.length === 0) {
        setState({ data: null, loading: false, error: 'Unable to load wallet tokens' });
      } else {
        setState({ data: { erc20s, erc721s, erc1155s, source }, loading: false, error: blockscoutFailed ? 'Using on-chain token scan (limited)' : null });
      }
    })();

    return () => { cancelled = true; };
  }, [address]);

  return state;
}
