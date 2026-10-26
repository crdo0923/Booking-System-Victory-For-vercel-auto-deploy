import { getRepository } from "@/lib/data";
import { zonedDayRange } from "@/lib/domain/time";
import { LobbyHubClient } from "@/components/display/lobby-hub-client";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function LobbyHubPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-canvas text-ink font-sans">
        <div className="max-w-md rounded-lg border border-line bg-surface p-8 shadow-sm">
          <p className="eyebrow text-denied">Display Setup Required</p>
          <h2 className="headline mt-2 text-3xl font-bold">Pairing Token Required</h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            This TV hub display has not been paired. Please configure the display URL with a valid token from the Church Office Displays manager.
          </p>
        </div>
      </div>
    );
  }

  const repo = await getRepository();
  const display = await repo.getKioskDisplayByToken(token);

  if (!display || !display.isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-canvas text-ink font-sans">
        <div className="max-w-md rounded-lg border border-line bg-surface p-8 shadow-sm">
          <p className="eyebrow text-pending">Access Revoked</p>
          <h2 className="headline mt-2 text-3xl font-bold">Display Token Invalid or Revoked</h2>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            This display token has been revoked or expired. Please re-pair this display in the Church Office Admin Portal.
          </p>
        </div>
      </div>
    );
  }

  await repo.touchKioskDisplay(token);

  const rooms = await repo.listActiveRooms();

  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const { start: dayStart, end: dayEnd } = zonedDayRange(todayKey);

  const bookings = await repo.listBookingsBetween(dayStart, dayEnd, ["approved", "pending"]);
  const announcements = await repo.listLiveAnnouncements();

  return (
    <LobbyHubClient
      token={token}
      initialRooms={rooms}
      initialBookings={bookings}
      initialAnnouncements={announcements}
      displayLabel={display.label}
    />
  );
}
