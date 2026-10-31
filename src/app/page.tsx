import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/config";
import { PublicShell } from "@/components/public/public-shell";
import { IframeSessionSync } from "@/components/auth/iframe-session-sync";
import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: APP_NAME },
  description: "Room reservations and facility scheduling for Victory Church facilities.",
  robots: { index: true, follow: true },
};

const steps = [
  { title: "Check availability", body: "See each room's open times, kept in step with the church calendar." },
  { title: "Request a room", body: "Pick a date and time, and tell the church office what the gathering is for." },
  { title: "Admin approval", body: "The church office reviews every request and approves or declines it. You're notified by email either way." },
  { title: "Track your bookings", body: "Follow each request from pending to approved, and cancel anything you no longer need." },
  { title: "Google Calendar", body: "Connect your Google Calendar once, and approved reservations are added to it automatically — and removed if cancelled." },
];

/** The public face of the system: calm, editorial layout matching design-references.md. Zero scroll on desktop. */
export default async function HomePage() {
  await connection();
  let user: SessionUser | null = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[home] session lookup failed:", error instanceof Error ? error.message : error);
  }

  // If already authenticated, redirect straight to portal (which resolves to /admin or /dashboard)
  if (user) {
    redirect("/portal");
  }

  const actions = (
    <>
      <Link href="/login" className={buttonStyles({ variant: "quiet", size: "sm" })}>
        Sign in
      </Link>
      <Link href="/login?mode=signup" className={buttonStyles({ size: "sm" })}>
        Create account
      </Link>
    </>
  );

  return (
    <PublicShell actions={actions}>
      <div className="mx-auto flex h-full max-w-6xl flex-1 items-center px-6 py-6 sm:px-10 lg:py-8">
        <div className="grid w-full gap-10 lg:grid-cols-12 lg:gap-14 items-center">
          <section aria-labelledby="intro-heading" className="lg:col-span-6">
            <IframeSessionSync />
            <p className="eyebrow text-muted">Victory Church · Facilities</p>
            <h1 id="intro-heading" className="headline mt-3 text-4xl sm:text-5xl lg:text-[3.25rem] leading-[1.08]">
              Victory Booking System
            </h1>
            <p className="mt-4 text-lg font-medium leading-relaxed text-ink">
              A room reservation system for Victory Church facilities.
            </p>
            <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted">
              Victory groups, ministries and staff use it to reserve classrooms and event spaces for meetings, classes and rehearsals. New accounts are approved by the church office before they can book.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className={buttonStyles({ size: "md" })}>
                Sign in
              </Link>
              <Link href="/login?mode=signup" className={buttonStyles({ variant: "secondary", size: "md" })}>
                Create account
              </Link>
            </div>
          </section>

          <section aria-labelledby="how-heading" className="lg:col-span-6">
            <h2 id="how-heading" className="eyebrow text-muted">
              How it works
            </h2>
            <ol className="mt-3 border-t border-ink">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4 border-b border-line py-3">
                  <span className="w-6 shrink-0 pt-0.5 font-serif text-base text-subtle tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold text-ink">{step.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3.5 text-xs leading-relaxed text-muted">
              Google Calendar access is used only to add and remove your approved reservations. Read the{" "}
              <Link href="/privacy#google-calendar" className="font-semibold text-brand hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </PublicShell>
  );
}
