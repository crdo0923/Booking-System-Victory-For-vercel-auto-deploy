import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { zonedDayRange } from "@/lib/domain/time";
import { DoorSignClient } from "@/components/display/door-sign-client";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function DoorSignPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-[#0d1520]">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-950/30 p-8 text-red-200">
          <h2 className="font-serif text-2xl font-bold">Pairing Token Required</h2>
          <p className="mt-2 text-sm text-red-300">
            This display tablet has not been paired. Please scan the QR code or configure the URL with a valid token from the Church Office Displays manager.
          </p>
        </div>
      </div>
    );
  }

  const repo = await getRepository();
  const display = await repo.getKioskDisplayByToken(token);

  if (!display || !display.isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-[#0d1520]">
        <div className="max-w-md rounded-2xl border border-amber-500/20 bg-amber-950/30 p-8 text-amber-200">
          <h2 className="font-serif text-2xl font-bold">Display Token Invalid or Revoked</h2>
          <p className="mt-2 text-sm text-amber-300">
            This tablet pairing has been revoked or expired. Please re-pair this tablet in the Church Office Admin Portal.
          </p>
        </div>
      </div>
    );
  }

  await repo.touchKioskDisplay(token);

  const room = await repo.getRoomBySlug(slug);
  if (!room) {
    notFound();
  }

  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const { start: dayStart, end: dayEnd } = zonedDayRange(todayKey);

  const allBookings = await repo.listBookingsBetween(dayStart, dayEnd, ["approved", "pending"]);
  const initialBookings = allBookings
    .filter((b) => b.roomId === room.id)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const initialLayout = await repo.getRoomLayout(room.id);

  return (
    <DoorSignClient
      token={token}
      room={room}
      initialBookings={initialBookings}
      initialLayout={initialLayout}
      displayLabel={display.label}
    />
  );
}
