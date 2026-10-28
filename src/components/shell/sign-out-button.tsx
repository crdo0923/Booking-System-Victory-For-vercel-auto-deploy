"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  className?: string;
  variant?: "icon" | "nav" | "compact";
}

export function SignOutButton({ variant = "icon" }: SignOutButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          variant === "icon"
            ? "flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            : variant === "nav"
              ? "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-bold text-muted transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand w-full text-left"
              : "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        }
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        {variant === "nav" && <span>Sign out</span>}
      </button>

      <Dialog
        open={isOpen}
        onClose={() => !isPending && setIsOpen(false)}
        title="Sign out of Victory Booking"
        description="Are you sure you want to end your current session?"
        locked={isPending}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleSignOut}
              disabled={isPending}
            >
              {isPending ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          You will need to sign in again to submit room reservation requests, check schedules, or access administrative tools.
        </p>
      </Dialog>
    </>
  );
}
