import { describe, expect, it } from "vitest";
import { createDemoRepository } from "@/lib/demo/repository";
import {
  createRoomAssetService,
  updateRoomAssetService,
  archiveRoomAssetService,
  moveRoomAssetService,
} from "@/lib/services/assets";
import { admin, member } from "./fakes";

describe("Room Assets & Asset Movement Service", () => {
  it("lists seeded room assets categorized as fixed or movable", async () => {
    const repo = createDemoRepository();
    const assets = await repo.listRoomAssets();

    expect(assets.length).toBeGreaterThanOrEqual(8);
    const movable = assets.filter((a) => a.isMovable);
    const fixed = assets.filter((a) => !a.isMovable);

    expect(movable.length).toBeGreaterThan(0);
    expect(fixed.length).toBeGreaterThan(0);

    const projector = assets.find((a) => a.name.includes("Projector"));
    expect(projector).toBeDefined();
    expect(projector?.isMovable).toBe(false);

    const console = assets.find((a) => a.name.includes("X32"));
    expect(console).toBeDefined();
    expect(console?.isMovable).toBe(true);
  });

  it("filters assets by room and mobility", async () => {
    const repo = createDemoRepository();
    const rooms = await repo.listActiveRooms();
    const roomA = rooms[0];

    const roomAAssets = await repo.listRoomAssets({ roomId: roomA.id });
    expect(roomAAssets.length).toBeGreaterThan(0);
    expect(roomAAssets.every((a) => a.roomId === roomA.id)).toBe(true);

    const roomAMovable = await repo.listRoomAssets({ roomId: roomA.id, isMovable: true });
    expect(roomAMovable.every((a) => a.roomId === roomA.id && a.isMovable)).toBe(true);
  });

  it("denies non-admin members from creating or relocating assets", async () => {
    const repo = createDemoRepository();
    const rooms = await repo.listActiveRooms();

    const form = new FormData();
    form.set("roomId", rooms[0].id);
    form.set("name", "Shure SM58");
    form.set("category", "av_production");
    form.set("isMovable", "true");
    form.set("condition", "good");
    form.set("quantity", "1");

    const result = await createRoomAssetService(form, member, { repo });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("forbidden");
    }

    const moveForm = new FormData();
    moveForm.set("assetId", "asset-002");
    moveForm.set("toRoomId", rooms[1].id);

    const moveResult = await moveRoomAssetService(moveForm, member, { repo });
    expect(moveResult.ok).toBe(false);
    if (!moveResult.ok) {
      expect(moveResult.code).toBe("forbidden");
    }
  });

  it("creates a new room asset and updates its properties for admins", async () => {
    const repo = createDemoRepository();
    const rooms = await repo.listActiveRooms();

    const form = new FormData();
    form.set("roomId", rooms[0].id);
    form.set("name", "Fender Champion 50XL Guitar Amp");
    form.set("assetTag", "VIC-AMP-001");
    form.set("category", "instrument");
    form.set("isMovable", "true");
    form.set("condition", "excellent");
    form.set("quantity", "1");
    form.set("serialNumber", "FND-992-01");
    form.set("modelNumber", "2330500000");
    form.set("notes", "Backline stage amp");

    const result = await createRoomAssetService(form, admin, { repo });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const asset = await repo.getRoomAsset(result.data.id);
      expect(asset).toBeDefined();
      expect(asset?.name).toBe("Fender Champion 50XL Guitar Amp");
      expect(asset?.isMovable).toBe(true);
      expect(asset?.roomId).toBe(rooms[0].id);

      // Update
      const editForm = new FormData();
      editForm.set("id", asset!.id);
      editForm.set("roomId", rooms[0].id);
      editForm.set("name", "Fender Champion 50XL Guitar Amp (Main Hall)");
      editForm.set("category", "instrument");
      editForm.set("isMovable", "true");
      editForm.set("condition", "good");
      editForm.set("quantity", "1");

      const editResult = await updateRoomAssetService(editForm, admin, { repo });
      expect(editResult.ok).toBe(true);

      const updated = await repo.getRoomAsset(asset!.id);
      expect(updated?.name).toBe("Fender Champion 50XL Guitar Amp (Main Hall)");
      expect(updated?.condition).toBe("good");
    }
  });

  it("relocates a movable asset between rooms and logs the movement audit trail", async () => {
    const repo = createDemoRepository();
    const rooms = await repo.listActiveRooms();
    const fromRoom = rooms[0];
    const toRoom = rooms[1];

    // Find a movable asset in room A
    const assets = await repo.listRoomAssets({ roomId: fromRoom.id, isMovable: true });
    const asset = assets[0];

    const moveForm = new FormData();
    moveForm.set("assetId", asset.id);
    moveForm.set("toRoomId", toRoom.id);
    moveForm.set("reason", "Transferred for Sunday Youth Fellowship");

    const moveResult = await moveRoomAssetService(moveForm, admin, { repo });
    expect(moveResult.ok).toBe(true);

    // Verify asset's current room updated
    const movedAsset = await repo.getRoomAsset(asset.id);
    expect(movedAsset?.roomId).toBe(toRoom.id);

    // Verify movement history log
    const movements = await repo.listAssetMovements({ assetId: asset.id });
    expect(movements.length).toBeGreaterThanOrEqual(1);
    expect(movements[0].fromRoomId).toBe(fromRoom.id);
    expect(movements[0].toRoomId).toBe(toRoom.id);
    expect(movements[0].reason).toBe("Transferred for Sunday Youth Fellowship");
  });

  it("prevents fixed assets from being moved", async () => {
    const repo = createDemoRepository();
    const rooms = await repo.listActiveRooms();

    // Find fixed asset
    const fixedAssets = await repo.listRoomAssets({ isMovable: false });
    const fixedAsset = fixedAssets[0];

    const moveForm = new FormData();
    moveForm.set("assetId", fixedAsset.id);
    moveForm.set("toRoomId", rooms[1].id);

    const moveResult = await moveRoomAssetService(moveForm, admin, { repo });
    expect(moveResult.ok).toBe(false);
    if (!moveResult.ok) {
      expect(moveResult.code).toBe("invalid");
      expect(moveResult.error).toContain("Fixed assets cannot be moved");
    }
  });

  it("archives an asset and excludes it from default room listings", async () => {
    const repo = createDemoRepository();
    const assets = await repo.listRoomAssets();
    const target = assets[assets.length - 1];

    const archiveResult = await archiveRoomAssetService(target.id, admin, { repo });
    expect(archiveResult.ok).toBe(true);

    const activeAssets = await repo.listRoomAssets({ includeArchived: false });
    expect(activeAssets.some((a) => a.id === target.id)).toBe(false);

    const allAssets = await repo.listRoomAssets({ includeArchived: true });
    expect(allAssets.some((a) => a.id === target.id && a.isArchived)).toBe(true);
  });
});
