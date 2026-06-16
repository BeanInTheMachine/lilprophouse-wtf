import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { http } from 'wagmi';

const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org';
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const config = getDefaultConfig({
  appName: 'Lil Rounds',
  projectId: projectId ?? '',
  chains: [base],
  transports: {
    [base.id]: http(baseRpcUrl),
  },
  ssr: true,
});
