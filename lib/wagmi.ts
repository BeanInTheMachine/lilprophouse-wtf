import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet } from 'wagmi/chains';
import { http } from 'wagmi';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const config = getDefaultConfig({
  appName: 'Prop House',
  projectId: projectId ?? '',
  chains: [mainnet],
  transports: {
    [mainnet.id]: rpcUrl ? http(rpcUrl) : http(),
  },
  ssr: true,
});
