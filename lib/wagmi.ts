import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, base } from 'wagmi/chains';
import { http } from 'wagmi';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org';
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const config = getDefaultConfig({
  appName: 'Lil Prop House',
  projectId: projectId ?? '',
  chains: [base, mainnet],
  transports: {
    [mainnet.id]: rpcUrl ? http(rpcUrl) : http(),
    [base.id]: http(baseRpcUrl),
  },
  ssr: true,
});
