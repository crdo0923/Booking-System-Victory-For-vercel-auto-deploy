import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getLayoutPresets, getRepositoryForRequest, getRoomLayout } from "@/lib/data/queries";
import { RoomLayoutEditor } from "@/components/layout-editor/room-layout-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const repo = await getRepositoryForRequest();
  const room = (await repo.getRoomById(id)) ?? (await repo.getRoomBySlug(id));
  return {
    title: room ? `Layout Editor: ${room.name}` : "Room Layout Editor",
  };
}

export default async function RoomLayoutEditorPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;
  const repo = await getRepositoryForRequest();

  // Support lookup by UUID, or slug, or fallback gracefully to first room
  let room = await repo.getRoomById(id);
  if (!room) {
    room = await repo.getRoomBySlug(id);
  }
  if (!room) {
    const all = await repo.listAllRooms();
    room = all[0] ?? null;
  }

  if (!room) {
    notFound();
  }

  const [layout, presets, allRooms] = await Promise.all([
    getRoomLayout(room.id),
    getLayoutPresets(),
    repo.listAllRooms(),
  ]);

  return (
    <RoomLayoutEditor
      room={room}
      allRooms={allRooms}
      initialLayout={layout}
      presets={presets}
    />
  );
}
