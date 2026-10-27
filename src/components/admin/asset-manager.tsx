"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Edit2,
  Filter,
  Layers,
  Lock,
  Plus,
  Search,
  Unlock,
} from "lucide-react";
import type { AssetCategory, AssetMovement, Room, RoomAsset } from "@/lib/data/types";
import { ASSET_CATEGORIES } from "@/lib/validation/assets";
import { archiveRoomAssetAction } from "@/app/actions/assets";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { RoomAssetDialog } from "@/components/admin/room-asset-dialog";
import { MoveAssetDialog } from "@/components/admin/move-asset-dialog";
import { cn } from "@/lib/utils";

interface AssetManagerProps {
  initialAssets: RoomAsset[];
  initialMovements: AssetMovement[];
  rooms: Room[];
}

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  av_production: "AV & Sound",
  furniture: "Furniture",
  instrument: "Instruments",
  it_hardware: "IT & Video",
  appliance: "Appliances",
  fixture: "Fixtures",
  other: "Other",
};

export function AssetManager({ initialAssets, initialMovements, rooms }: AssetManagerProps) {
  const [activeTab, setActiveTab] = useState<"assets" | "movements">("assets");
  const [assets, setAssets] = useState<RoomAsset[]>(initialAssets);
  const [movements, setMovements] = useState<AssetMovement[]>(initialMovements);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedMobility, setSelectedMobility] = useState<"all" | "movable" | "fixed">("all");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "all">("all");

  // Dialogs
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<RoomAsset | null>(null);

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [movingAsset, setMovingAsset] = useState<RoomAsset | null>(null);

  const [isPending, startTransition] = useTransition();

  // Metrics
  const metrics = useMemo(() => {
    let movableCount = 0;
    let fixedCount = 0;
    for (const a of assets) {
      if (a.isMovable) movableCount++;
      else fixedCount++;
    }
    return {
      total: assets.length,
      movable: movableCount,
      fixed: fixedCount,
      movementsCount: movements.length,
    };
  }, [assets, movements]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (selectedRoom !== "all" && asset.roomId !== selectedRoom) return false;
      if (selectedMobility === "movable" && !asset.isMovable) return false;
      if (selectedMobility === "fixed" && asset.isMovable) return false;
      if (selectedCategory !== "all" && asset.category !== selectedCategory) return false;

      if (!q) return true;
      return (
        asset.name.toLowerCase().includes(q) ||
        (asset.assetTag && asset.assetTag.toLowerCase().includes(q)) ||
        (asset.roomName && asset.roomName.toLowerCase().includes(q)) ||
        (asset.serialNumber && asset.serialNumber.toLowerCase().includes(q)) ||
        (asset.modelNumber && asset.modelNumber.toLowerCase().includes(q))
      );
    });
  }, [assets, search, selectedRoom, selectedMobility, selectedCategory]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => {
      if (selectedRoom !== "all" && m.fromRoomId !== selectedRoom && m.toRoomId !== selectedRoom) {
        return false;
      }
      if (!q) return true;
      return (
        (m.assetName && m.assetName.toLowerCase().includes(q)) ||
        (m.assetTag && m.assetTag.toLowerCase().includes(q)) ||
        (m.fromRoomName && m.fromRoomName.toLowerCase().includes(q)) ||
        (m.toRoomName && m.toRoomName.toLowerCase().includes(q)) ||
        (m.reason && m.reason.toLowerCase().includes(q)) ||
        (m.movedByName && m.movedByName.toLowerCase().includes(q))
      );
    });
  }, [movements, search, selectedRoom]);

  function handleOpenCreate() {
    setEditingAsset(null);
    setAssetDialogOpen(true);
  }

  function handleOpenEdit(asset: RoomAsset) {
    setEditingAsset(asset);
    setAssetDialogOpen(true);
  }

  function handleOpenMove(asset: RoomAsset) {
    setMovingAsset(asset);
    setMoveDialogOpen(true);
  }

  function handleArchive(asset: RoomAsset) {
    if (!confirm(`Are you sure you want to archive "${asset.name}"?`)) return;

    startTransition(async () => {
      const result = await archiveRoomAssetAction(asset.id);
      if (result.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      } else {
        alert(result.error ?? "Failed to archive asset.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Subnavigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-line gap-4 pb-0">
        <nav aria-label="Asset Sections" className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("assets")}
            className={cn(
              "flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-colors",
              activeTab === "assets"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            <Layers className="size-4" />
            Room Assets List
            <span className="text-xs text-muted tabular-nums">({assets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("movements")}
            className={cn(
              "flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-colors",
              activeTab === "movements"
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            <ArrowRightLeft className="size-4" />
            Asset Movement History
            <span className="text-xs text-muted tabular-nums">({movements.length})</span>
          </button>
        </nav>

        {/* Global Action Button */}
        <div className="flex items-center gap-2 pb-3 sm:pb-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="size-3.5" />
            Register Asset
          </Button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line border-y border-line sm:grid-cols-4">
        <div className="py-4 pr-4 sm:pr-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Total Assets</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
              {metrics.total}
            </span>
            <span className="text-xs text-muted">items</span>
          </div>
        </div>

        <div className="py-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Movable Gear</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
              {metrics.movable}
            </span>
            <span className="text-xs text-muted">relocatable</span>
          </div>
        </div>

        <div className="py-4 pr-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Fixed Fixtures</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
              {metrics.fixed}
            </span>
            <span className="text-xs text-muted">room-bound</span>
          </div>
        </div>

        <div className="py-4 sm:pl-6">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Transfers Logged</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-ink tabular-nums">
              {metrics.movementsCount}
            </span>
            <span className="text-xs text-muted">inter-room</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-line pb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === "assets" ? "Search asset, tag, or serial..." : "Search transfer history..."}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>

          {activeTab === "assets" && (
            <>
              <Select
                value={selectedMobility}
                onChange={(e) => setSelectedMobility(e.target.value as "all" | "movable" | "fixed")}
                className="text-xs"
              >
                <option value="all">All Types (Fixed & Movable)</option>
                <option value="movable">Movable Gear Only</option>
                <option value="fixed">Fixed Fixtures Only</option>
              </Select>

              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as AssetCategory | "all")}
                className="text-xs"
              >
                <option value="all">All Categories</option>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: ASSETS LIST PER ROOM */}
      {activeTab === "assets" && (
        <div className="space-y-4">
          {filteredAssets.length === 0 ? (
            <EmptyState
              title="No assets found"
              description="No assets match your search and room filter criteria."
            />
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="py-3 pr-4 font-normal">Asset Details</th>
                    <th className="py-3 px-4 font-normal">Assigned Room</th>
                    <th className="py-3 px-4 font-normal">Portability</th>
                    <th className="py-3 px-4 font-normal">Condition</th>
                    <th className="py-3 px-4 font-normal text-right">Qty</th>
                    <th className="py-3 pl-4 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="group transition-colors hover:bg-canvas/60"
                    >
                      {/* Name & Identifiers */}
                      <td className="py-4 pr-4">
                        <div className="font-bold text-ink">{asset.name}</div>
                        <div className="mt-0.5 text-xs text-muted flex items-center gap-2 flex-wrap">
                          <span>{CATEGORY_LABELS[asset.category]}</span>
                          {asset.assetTag && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-ink-soft">Tag: {asset.assetTag}</span>
                            </>
                          )}
                          {asset.serialNumber && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px]">S/N: {asset.serialNumber}</span>
                            </>
                          )}
                        </div>
                        {asset.notes && (
                          <div className="mt-1 text-[11px] text-muted italic truncate max-w-md">
                            {asset.notes}
                          </div>
                        )}
                      </td>

                      {/* Assigned Room */}
                      <td className="py-4 px-4 text-xs font-medium text-ink">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-brand" />
                          {asset.roomName || "Unassigned"}
                        </div>
                      </td>

                      {/* Mobility */}
                      <td className="py-4 px-4 text-xs">
                        {asset.isMovable ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-800 dark:text-emerald-300">
                            <Unlock className="size-3 text-emerald-600" />
                            Movable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-muted">
                            <Lock className="size-3 text-muted" />
                            Fixed Fixture
                          </span>
                        )}
                      </td>

                      {/* Condition */}
                      <td className="py-4 px-4 text-xs capitalize text-ink-soft">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-muted" />
                          {asset.condition.replace("_", " ")}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-4 px-4 text-right font-bold tabular-nums text-sm text-ink">
                        {asset.quantity}
                      </td>

                      {/* Actions */}
                      <td className="py-4 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {asset.isMovable && (
                            <Button
                              variant="quiet"
                              size="sm"
                              onClick={() => handleOpenMove(asset)}
                              className="h-8 px-2 text-xs text-brand hover:text-brand-deep"
                              title="Transfer asset to another room"
                            >
                              <ArrowRightLeft className="size-3.5" />
                              <span className="sr-only">Transfer</span>
                            </Button>
                          )}
                          <Button
                            variant="quiet"
                            size="sm"
                            onClick={() => handleOpenEdit(asset)}
                            className="h-8 px-2 text-xs text-muted hover:text-ink"
                            title="Edit Asset"
                          >
                            <Edit2 className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="quiet"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleArchive(asset)}
                            className="h-8 px-2 text-xs text-muted hover:text-rose-600"
                            title="Archive Asset"
                          >
                            <Archive className="size-3.5" />
                            <span className="sr-only">Archive</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSET MOVEMENT HISTORY */}
      {activeTab === "movements" && (
        <div className="space-y-4">
          {filteredMovements.length === 0 ? (
            <EmptyState
              title="No movements logged"
              description="No movable equipment has been transferred between rooms yet."
            />
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <th className="py-3 pr-4 font-normal">Date & Time</th>
                    <th className="py-3 px-4 font-normal">Asset Transferred</th>
                    <th className="py-3 px-4 font-normal">Origin Room</th>
                    <th className="py-3 px-4 font-normal">Destination Room</th>
                    <th className="py-3 px-4 font-normal">Reason / Ministry</th>
                    <th className="py-3 pl-4 font-normal">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {filteredMovements.map((mov) => {
                    const dateObj = new Date(mov.movedAt);
                    const formattedDate = dateObj.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const formattedTime = dateObj.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={mov.id} className="group hover:bg-canvas/50">
                        {/* Timestamp */}
                        <td className="py-3 pr-4 text-xs">
                          <div className="font-medium text-ink">{formattedDate}</div>
                          <div className="text-[11px] text-muted">{formattedTime}</div>
                        </td>

                        {/* Asset */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-ink text-xs">{mov.assetName || "Asset"}</div>
                          {mov.assetTag && (
                            <div className="font-mono text-[11px] text-muted">{mov.assetTag}</div>
                          )}
                        </td>

                        {/* Origin Room */}
                        <td className="py-3 px-4 text-xs text-muted">
                          {mov.fromRoomName || "Origin"}
                        </td>

                        {/* Destination Room */}
                        <td className="py-3 px-4 text-xs font-semibold text-ink">
                          <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-600" />
                            {mov.toRoomName || "Destination"}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-4 text-xs text-muted max-w-xs truncate" title={mov.reason ?? undefined}>
                          {mov.reason || "Room transfer"}
                        </td>

                        {/* Moved By */}
                        <td className="py-3 pl-4 text-xs text-muted">
                          {mov.movedByName || "Staff Admin"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dialog: Create/Edit Room Asset */}
      <RoomAssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        asset={editingAsset}
        rooms={rooms}
        defaultRoomId={selectedRoom !== "all" ? selectedRoom : undefined}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {/* Dialog: Relocate Movable Asset */}
      <MoveAssetDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        asset={movingAsset}
        rooms={rooms}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
