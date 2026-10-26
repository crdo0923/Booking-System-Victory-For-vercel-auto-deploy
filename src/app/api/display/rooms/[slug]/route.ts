import { NextResponse, type NextRequest } from "next/server";
import { getRepository } from "@/lib/data";
import { zonedDayRange } from "@/lib/domain/time";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
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

  const room = await repo.getRoomBySlug(slug);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Today's range in Manila time
  const now = new Date();
  const todayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const { start: dayStart, end: dayEnd } = zonedDayRange(todayKey);

  // Fetch approved & pending bookings for this room today
  const allBookings = await repo.listBookingsBetween(dayStart, dayEnd, ["approved", "pending"]);
  const roomBookings = allBookings
    .filter((b) => b.roomId === room.id)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Room layout preview
  const layout = await repo.getRoomLayout(room.id);

  return NextResponse.json({
    room,
    bookings: roomBookings,
    layout,
    display: {
      id: display.id,
      label: display.label,
      displayType: display.displayType,
    },
    serverTimeIso: now.toISOString(),
  });
}
