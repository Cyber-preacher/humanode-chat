"use client";

import React from "react";

type Props = {
  newNick: string;
  setNewNick: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
};

export default function NicknameForm({
  newNick,
  setNewNick,
  onSubmit,
  isSubmitting,
  canSubmit,
}: Props) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input
        placeholder="Choose a nickname"
        value={newNick}
        onChange={(e) => setNewNick(e.target.value)}
        style={{ padding: 8, flex: 1, border: "1px solid #d1d5db", borderRadius: 8 }}
      />
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          opacity: canSubmit ? 1 : 0.6,
          cursor: canSubmit ? "pointer" : "not-allowed",
        }}
      >
        {isSubmitting ? "Setting..." : "Set nickname"}
      </button>
    </div>
  );
}