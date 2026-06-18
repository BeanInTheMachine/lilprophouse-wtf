import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, mainnet } from 'wagmi/chains';
import { http } from 'wagmi';

const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org';
const mainnetRpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://eth.llamarpc.com';
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const config = getDefaultConfig({
  appName: 'Lil Rounds',
  projectId: projectId ?? '',
  chains: [base, mainnet],
  transports: {
    [base.id]: http(baseRpcUrl),
    [mainnet.id]: http(mainnetRpcUrl),
  },
  ssr: true,
});
