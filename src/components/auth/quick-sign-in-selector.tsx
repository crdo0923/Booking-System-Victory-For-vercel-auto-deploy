"use client";

import { useState, useTransition } from "react";
import {
  Clock,
  HardHat,
  HeartHandshake,
  Loader2,
  Shield,
  UserCheck,
} from "lucide-react";
import { quickSignInAction } from "@/app/actions/auth";
import { setStoredDemoUser } from "@/lib/auth/demo-storage";

export interface DemoQuickAccount {
  email: string;
  fullName: string;
  role: "admin" | "user";
  systemRole: "admin" | "facility_team" | "pastoral_staff" | "member" | "guest";
  label: string;
  roleDescription: string;
  accessStatus: "active" | "pending";
}

interface QuickSignInSelectorProps {
  accounts: DemoQuickAccount[];
  next?: string;
}

const roleIcons: Record<DemoQuickAccount["systemRole"], React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  facility_team: HardHat,
  pastoral_staff: HeartHandshake,
  member: UserCheck,
  guest: Clock,
};

export function QuickSignInSelector({ accounts, next }: QuickSignInSelectorProps) {
  const [signingEmail, setSigningEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(email: string) {
    setSigningEmail(email);
    setError(null);
    setStoredDemoUser(email);

    startTransition(async () => {
      const res = await quickSignInAction(email, next);
      if (res?.error) {
        setError(res.error);
        setSigningEmail(null);
      }
    });
  }

  return (
    <div className="mb-4 rounded-lg border border-line bg-canvas p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-ink">
          Quick Demo Sign-in
        </span>
        <span className="text-[10px] text-muted">
          Click any role to test:
        </span>
      </div>

      {error && (
        <div className="mb-2 rounded border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Compact pill chips */}
      <div className="flex flex-wrap gap-1.5">
        {accounts.map((acc) => {
          const Icon = roleIcons[acc.systemRole] || Shield;
          const isSelected = signingEmail === acc.email;

          return (
            <button
              key={acc.email}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(acc.email)}
              title={`${acc.label} (${acc.fullName} · ${acc.email})\n${acc.roleDescription}`}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all ${
                isSelected
                  ? "border-brand bg-brand text-white shadow-xs"
                  : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
              } disabled:opacity-60`}
            >
              {isSelected ? (
                <Loader2 className="size-3 animate-spin text-white" />
              ) : (
                <Icon className="size-3 text-muted" />
              )}
              <span>{acc.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
