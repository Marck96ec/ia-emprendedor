"use client";

import { useState } from "react";

type CopyMessageButtonProps = {
  message: string;
};

export function CopyMessageButton({ message }: CopyMessageButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyMessage}
      className="secondary-button px-3 py-2 text-sm"
      aria-label="Copiar mensaje comercial"
    >
      {copied ? "Copiado" : "Copiar mensaje"}
    </button>
  );
}