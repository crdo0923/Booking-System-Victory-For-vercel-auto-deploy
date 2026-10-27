import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDataMode } from "@/lib/env";
import { safeRedirectPath } from "@/lib/utils";
import { firstParam } from "@/lib/validation/params";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { QuickSignInSelector, type DemoQuickAccount } from "@/components/auth/quick-sign-in-selector";
import { Notice } from "@/components/ui/notice";
import { DEMO_ACCOUNTS } from "@/lib/demo/seed";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  // The homepage is public, so "/" (or no target) means "the portal" after sign-in.
  const requested = safeRedirectPath(firstParam(params.next), "/portal");
  const next = requested === "/" ? "/portal" : requested;
  if (await getCurrentUser()) redirect(next);

  const isDemo = getDataMode() === "demo";
  const passwordReset = firstParam(params.reset) === "1";

  const quickAccounts: DemoQuickAccount[] = [
    {
      email: DEMO_ACCOUNTS.admin.email,
      fullName: DEMO_ACCOUNTS.admin.fullName,
      role: DEMO_ACCOUNTS.admin.role,
      systemRole: DEMO_ACCOUNTS.admin.systemRole,
      label: DEMO_ACCOUNTS.admin.label,
      roleDescription: DEMO_ACCOUNTS.admin.roleDescription,
      accessStatus: "active",
    },
    {
      email: DEMO_ACCOUNTS.facility_team.email,
      fullName: DEMO_ACCOUNTS.facility_team.fullName,
      role: DEMO_ACCOUNTS.facility_team.role,
      systemRole: DEMO_ACCOUNTS.facility_team.systemRole,
      label: DEMO_ACCOUNTS.facility_team.label,
      roleDescription: DEMO_ACCOUNTS.facility_team.roleDescription,
      accessStatus: "active",
    },
    {
      email: DEMO_ACCOUNTS.pastoral_staff.email,
      fullName: DEMO_ACCOUNTS.pastoral_staff.fullName,
      role: DEMO_ACCOUNTS.pastoral_staff.role,
      systemRole: DEMO_ACCOUNTS.pastoral_staff.systemRole,
      label: DEMO_ACCOUNTS.pastoral_staff.label,
      roleDescription: DEMO_ACCOUNTS.pastoral_staff.roleDescription,
      accessStatus: "active",
    },
    {
      email: DEMO_ACCOUNTS.member.email,
      fullName: DEMO_ACCOUNTS.member.fullName,
      role: DEMO_ACCOUNTS.member.role,
      systemRole: DEMO_ACCOUNTS.member.systemRole,
      label: DEMO_ACCOUNTS.member.label,
      roleDescription: DEMO_ACCOUNTS.member.roleDescription,
      accessStatus: "active",
    },
    {
      email: DEMO_ACCOUNTS.guest.email,
      fullName: DEMO_ACCOUNTS.guest.fullName,
      role: DEMO_ACCOUNTS.guest.role,
      systemRole: DEMO_ACCOUNTS.guest.systemRole,
      label: DEMO_ACCOUNTS.guest.label,
      roleDescription: DEMO_ACCOUNTS.guest.roleDescription,
      accessStatus: "pending",
    },
  ];

  return (
    <AuthLayout footer="For Victory members, volunteers and staff.">
      {passwordReset && (
        <Notice tone="success" className="mb-8">
          Password updated. Sign in with your new password.
        </Notice>
      )}

      {/* 1-Tap Sign-In Buttons */}
      <QuickSignInSelector accounts={quickAccounts} next={next} />

      <div className="relative my-8 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-canvas px-3 font-semibold tracking-wider text-muted">
            Or sign in with password
          </span>
        </div>
      </div>

      <AuthForm next={next} initialMode={firstParam(params.mode) === "signup" ? "signup" : "signin"} />
    </AuthLayout>
  );
}
