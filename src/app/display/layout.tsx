import type { ReactNode } from "react";

export const metadata = {
  title: "Victory Display",
  description: "Tablet & TV Wall Kiosk Display Mode",
};

export default function DisplayLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-canvas text-ink antialiased select-none font-sans overflow-x-hidden">
      {children}
    </div>
  );
}
