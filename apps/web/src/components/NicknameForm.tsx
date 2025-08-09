"use client";

import { useState } from "react";
import { useAccount, useChainId, useConfig, useWriteContract } from "wagmi";
import { simulateContract } from "@wagmi/core";

const PROFILE_REGISTRY = process.env.NEXT_PUBLIC_PROFILE_REGISTRY as `0x${string}`;
const BIOMAPPER_UI = "https://testnet5.biomapper.hmnd.app/"; // Testnet-5 UI

// Minimal ABI: only what we need
const profileRegistryAbi = [
  {
    type: "function",
    name: "setNickname",
    stateMutability: "nonpayable",
    inputs: [{ name: "nick", type: "string" }],
    outputs: [],
  },
] as const;

export function NicknameForm() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const { writeContractAsync, isPending } = useWriteContract();

  const [nick, setNick] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [promptBiomap, setPromptBiomap] = useState(false);

  if (!isConnected) return null;

  const handleSet = async () => {
    setNotice(null);
    setPromptBiomap(false);
    if (!address || !PROFILE_REGISTRY) {
      setNotice("Missing wallet or contract address.");
      return;
    }
    try {
      // 1) Pre-flight simulate: this will revert if you aren't biomapped
      const sim = await simulateContract(config, {
        address: PROFILE_REGISTRY,
        abi: profileRegistryAbi,
        functionName: "setNickname",
        args: [nick],
        account: address,
        chainId,
      });

      // 2) If simulation passed, send the actual tx using the prepared request
      const hash = await writeContractAsync(sim.request);
      setNotice(`Tx sent: ${hash}`);
    } catch (err: any) {
      // Most likely not biomapped (contract requires uniqueness)
      setPromptBiomap(true);
      setNotice(
        "You need to complete Biomapper verification before setting a nickname."
      );
    }
  };

  return (
    <div className="mt-6 rounded-xl border p-4">
      <h3 className="font-semibold mb-2">Set your nickname</h3>
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="nickname"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />
        <button
          onClick={handleSet}
          disabled={!nick || isPending}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Save"}
        </button>
      </div>

      {notice && <p className="mt-3 text-sm">{notice}</p>}

      {promptBiomap && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm mb-2">
            Not biomapped yet. Open the Biomapper app in a new tab, complete the
            flow, then come back and click “Recheck”.
          </p>
          <div className="flex gap-2">
            <a
              href={BIOMAPPER_UI}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-white border px-3 py-2 text-sm"
            >
              Open Biomapper
            </a>
            <button
              onClick={handleSet}
              className="rounded bg-black text-white px-3 py-2 text-sm"
            >
              Recheck
            </button>
          </div>
        </div>
      )}
    </div>
  );
}