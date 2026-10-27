import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";

/**
 * Split auth layout: the form on warm paper, beside a deep-navy panel carrying
 * Victory's tagline. The panel collapses away on small screens.
 */
export function AuthLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="flex flex-col justify-between px-6 py-6 sm:px-10 lg:px-12">
        <Link href="/" className="w-fit rounded-sm" aria-label={`${APP_NAME} home`}>
          <Image src="/brand/victory-logo.png" alt="Victory — Honor God. Make Disciples." width={654} height={132} loading="eager" className="h-auto w-36 sm:w-40" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-4 lg:py-6">
          <div className="w-full max-w-[460px] animate-fade-up">{children}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-2 text-xs text-muted">
          {footer && <p>{footer}</p>}
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-ink hover:underline">
              Terms of Use
            </Link>
          </nav>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-brand-deep text-white lg:flex lg:flex-col lg:justify-between p-12">
        <Image
          src="/brand/victory-mark.png"
          alt=""
          width={512}
          height={512}
          className="pointer-events-none absolute -top-20 -right-24 size-[480px] opacity-[0.14] mix-blend-luminosity"
          aria-hidden
        />
        <div className="relative">
          <span className="eyebrow text-white/60">{APP_NAME}</span>
        </div>
        <div className="relative max-w-sm">
          <p className="headline text-3xl xl:text-4xl leading-tight">Honor God. Make Disciples.</p>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            Reserve a room for your Victory group, ministry meeting, class or rehearsal. The church office confirms every request.
          </p>
        </div>
        <div className="relative text-xs text-white/40">
          Victory Church Philippines
        </div>
      </aside>
    </main>
  );
}
