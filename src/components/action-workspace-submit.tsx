"use client";

import { useFormStatus } from "react-dom";

type ActionWorkspaceSubmitProps = {
  label: string;
  pendingLabel: string;
  secondary?: boolean;
};

export function ActionWorkspaceSubmit({
  label,
  pendingLabel,
  secondary = false,
}: ActionWorkspaceSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${secondary ? "secondary-button" : "primary-button"} disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}