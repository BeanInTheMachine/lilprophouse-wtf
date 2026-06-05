import { http, createConfig, injected } from 'wagmi';
import { walletConnect } from 'wagmi/connectors';
import { mainnet } from 'wagmi/chains';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = projectId
  ? [injected(), walletConnect({ projectId })]
  : [injected()];

export const config = createConfig({
  chains: [mainnet],
  connectors,
  transports: {
    [mainnet.id]: rpcUrl ? http(rpcUrl) : http(),
  },
});
