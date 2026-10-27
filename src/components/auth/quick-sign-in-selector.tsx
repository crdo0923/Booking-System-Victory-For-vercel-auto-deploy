"use client";

import { useState, useTransition } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  HardHat,
  HeartHandshake,
  Loader2,
  Lock,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { quickSignInAction } from "@/app/actions/auth";

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

    startTransition(async () => {
      const res = await quickSignInAction(email, next);
      if (res?.error) {
        setError(res.error);
        setSigningEmail(null);
      }
    });
  }

  return (
    <div className="mt-8 rounded-xl border border-line bg-canvas p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <span className="font-serif text-base font-bold text-ink">
            1-Tap Role Sign-In
          </span>
          <p className="mt-0.5 text-xs text-muted">
            Instant switch between roles with their strict system permission boundaries.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded bg-sunken px-2 py-0.5 text-[10px] font-semibold text-muted uppercase tracking-wider">
          Demo Mode
        </span>
      </div>

      {error && (
        <div className="mt-3 rounded border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-2.5">
        {accounts.map((acc) => {
          const Icon = roleIcons[acc.systemRole] || Shield;
          const isSelected = signingEmail === acc.email;

          return (
            <button
              key={acc.email}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(acc.email)}
              className={`group flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
                  : "border-line bg-sunken/40 hover:border-ink/30 hover:bg-canvas"
              } disabled:opacity-60`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border ${
                    acc.systemRole === "admin"
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : acc.systemRole === "facility_team"
                        ? "border-blue-200 bg-blue-50 text-blue-900"
                        : acc.systemRole === "pastoral_staff"
                          ? "border-purple-200 bg-purple-50 text-purple-900"
                          : acc.systemRole === "member"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-zinc-200 bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <Icon className="size-4" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-ink truncate">
                      {acc.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      ({acc.systemRole})
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-muted truncate">
                    {acc.fullName} · <span className="font-mono text-[11px]">{acc.email}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted leading-tight">
                    {acc.roleDescription}
                  </p>
                </div>
              </div>

              <div className="ml-3 shrink-0 flex items-center">
                {isSelected ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Loader2 className="size-4 animate-spin" />
                    <span>Signing in…</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center rounded border border-line bg-canvas px-2.5 py-1 text-xs font-semibold text-ink transition-colors group-hover:bg-primary group-hover:border-primary group-hover:text-white">
                    Sign in
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
