"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function AuthSubmitButton({
  children,
  pendingLabel,
  className = "primary-button large",
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={disabled || pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
