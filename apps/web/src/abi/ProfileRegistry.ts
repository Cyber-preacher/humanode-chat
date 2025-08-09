export const ProfileRegistryAbi = [
  {
    "inputs":[{"internalType":"address","name":"who","type":"address"}],
    "name":"getNickname",
    "outputs":[{"internalType":"string","name":"","type":"string"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"string","name":"nickname","type":"string"}],
    "name":"setNickname",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  }
] as const;