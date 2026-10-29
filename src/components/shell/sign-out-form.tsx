"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { clearStoredDemoUser } from "@/lib/auth/demo-storage";
import { SubmitButton } from "@/components/ui/submit-button";

interface SignOutFormProps {
  variant?: "primary" | "secondary" | "quiet" | "danger";
  pendingLabel?: string;
  className?: string;
}

export function SignOutForm({
  variant = "secondary",
  pendingLabel = "Signing out…",
  className,
}: SignOutFormProps) {
  const [, startTransition] = useTransition();

  return (
    <form
      action={() => {
        clearStoredDemoUser();
        startTransition(async () => {
          await signOutAction();
        });
      }}
      className={className}
    >
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>
        <LogOut className="size-4" aria-hidden />
        Sign out
      </SubmitButton>
    </form>
  );
}
