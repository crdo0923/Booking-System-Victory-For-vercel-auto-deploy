import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { zonedDayRange } from "@/lib/domain/time";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Display token required" }, { status: 401 });
  }

  const repo = await getRepository();
  const display = await repo.getKioskDisplayByToken(token);

  if (!display || !display.isActive) {
    return NextResponse.json({ error: "Invalid or revoked display token" }, { status: 403 });
  }

  // Record heartbeat
  await repo.touchKioskDisplay(token);

  // Active rooms
  const rooms = await repo.listActiveRooms();

  // Today's range in Manila time
  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const { start: dayStart, end: dayEnd } = zonedDayRange(todayKey);

  const bookings = await repo.listBookingsBetween(dayStart, dayEnd, ["approved", "pending"]);
  const announcements = await repo.listLiveAnnouncements();

  return NextResponse.json({
    rooms,
    bookings,
    announcements,
    display: {
      id: display.id,
      label: display.label,
      displayType: display.displayType,
    },
    serverTimeIso: now.toISOString(),
  });
}
