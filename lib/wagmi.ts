import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: rpcUrl ? http(rpcUrl) : http(),
  },
});
