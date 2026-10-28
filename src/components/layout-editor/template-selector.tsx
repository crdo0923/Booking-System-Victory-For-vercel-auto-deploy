"use client";

import { useState } from "react";
import { FolderDown, BookmarkPlus } from "lucide-react";
import type { LayoutPreset, RoomLayout } from "@/lib/data/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/field";

interface TemplateSelectorProps {
  presets: LayoutPreset[];
  currentLayout: RoomLayout;
  onApplyPreset: (preset: LayoutPreset) => void;
  onSaveAsPreset: (preset: Omit<LayoutPreset, "id">) => Promise<void>;
}

export function TemplateSelector({
  presets,
  currentLayout,
  onApplyPreset,
  onSaveAsPreset,
}: TemplateSelectorProps) {
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Save preset form state
  const [presetName, setPresetName] = useState("");
  const [presetDesc, setPresetDesc] = useState("");
  const [presetCat, setPresetCat] = useState<"worship" | "classroom" | "fellowship" | "prayer">("worship");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!presetName.trim()) return;

    setIsSaving(true);
    try {
      await onSaveAsPreset({
        name: presetName.trim(),
        description: presetDesc.trim() || "Custom church room arrangement",
        category: presetCat,
        defaultCapacity: currentLayout.totalSeats,
        elements: currentLayout.elements,
      });
      setSaveModalOpen(false);
      setPresetName("");
      setPresetDesc("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setLoadModalOpen(true)}
          className="flex items-center gap-1.5 text-xs shrink-0"
        >
          <FolderDown className="size-3.5 text-brand" />
          <span>Presets & Templates</span>
        </Button>
      </div>

      {/* Load Preset Dialog */}
      <Dialog
        open={loadModalOpen}
        onClose={() => setLoadModalOpen(false)}
        title="Seating Presets & Templates"
        description="Choose a church arrangement optimized for Sunday services, seminars, or fellowships."
        size="lg"
      >
        <div className="max-h-[65vh] overflow-y-auto space-y-3 p-1">
          {/* Quick save banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-md border border-dashed border-brand/35 bg-brand-tint/40 p-3.5">
            <div>
              <p className="text-xs font-bold text-ink">Save current canvas arrangement?</p>
              <p className="text-xs text-muted">Add this arrangement to the template library for future bookings.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setLoadModalOpen(false);
                setSaveModalOpen(true);
              }}
              className="gap-1.5 text-xs font-bold shrink-0 self-start sm:self-auto text-brand border-brand/30 hover:bg-brand/10"
            >
              <BookmarkPlus className="size-3.5" />
              <span>Save as New Template</span>
            </Button>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Available Presets</h4>
            <div className="space-y-2.5">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between rounded-md border border-line bg-surface p-3.5 transition-all hover:border-brand/60 hover:bg-sunken/40"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{preset.name}</span>
                      <span className="rounded bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-bold text-brand uppercase">
                        {preset.category}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted leading-relaxed">{preset.description}</p>
                    <div className="mt-1.5 text-xs font-mono text-muted">
                      <span>Capacity: <strong className="text-ink">{preset.defaultCapacity} seats</strong></span> ·{" "}
                      <span>{preset.elements.length} elements</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onApplyPreset(preset);
                      setLoadModalOpen(false);
                    }}
                    className="shrink-0"
                  >
                    Apply Preset
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Save Current Layout as Template"
        description="Save this room arrangement into the church template library for reuse in other rooms and events."
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-ink">Template Name</label>
            <Input
              type="text"
              required
              placeholder="e.g. Youth Night Altar Layout"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink">Category</label>
            <Select
              value={presetCat}
              onChange={(e) => setPresetCat(e.target.value as typeof presetCat)}
              className="mt-1 text-sm"
            >
              <option value="worship">Sunday Worship & Praise</option>
              <option value="classroom">Workshop & Training</option>
              <option value="fellowship">Fellowship & Banquet</option>
              <option value="prayer">Prayer & Night Vigil</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink">Description</label>
            <Textarea
              rows={2}
              placeholder="e.g. Open center area for prayer and worship, side seating rows."
              value={presetDesc}
              onChange={(e) => setPresetDesc(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div className="rounded-md border border-line bg-sunken/50 p-3 text-xs text-muted">
            <span className="font-bold text-ink">Elements in snapshot:</span>{" "}
            {currentLayout.elements.length} items ({currentLayout.totalSeats} seats)
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setSaveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              busy={isSaving}
              busyLabel="Saving…"
            >
              Save Template
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
