import { defineChain } from 'viem';

export const humanodeTestnet5 = defineChain({
  id: 14853,
  name: 'Humanode Testnet-5',
  nativeCurrency: { name: 'eHMND', symbol: 'eHMND', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://explorer-rpc-http.testnet5.stages.humanode.io'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet5.stages.humanode.io' },
  },
});
