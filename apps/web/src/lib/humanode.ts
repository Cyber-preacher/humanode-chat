// apps/web/src/lib/humanode.ts
import type { Chain } from 'wagmi/chains';

export const humanodeTestnet5: Chain = {
  id: 14853,
  name: 'Humanode Testnet 5',
  nativeCurrency: { name: 'eHMND', symbol: 'eHMND', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://explorer-rpc-http.testnet5.stages.humanode.io'] },
    public: { http: ['https://explorer-rpc-http.testnet5.stages.humanode.io'] },
  },
} as const;
