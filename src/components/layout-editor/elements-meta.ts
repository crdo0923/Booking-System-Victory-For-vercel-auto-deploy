import type { LayoutElement, LayoutElementType } from "@/lib/data/types";

export interface PaletteItem {
  type: LayoutElementType;
  label: string;
  category: "church" | "tables" | "seating" | "architectural";
  width: number; // in meters
  length: number; // in meters
  defaultSeats: number;
  description: string;
  tableDiameterInches?: 36 | 48 | 60 | 72;
  tableDimensionsInches?: "30x72" | "30x96";
  chairsPerRow?: number;
  rowCount?: number;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  // Church Elements
  {
    type: "stage",
    label: "Stage / Platform",
    category: "church",
    width: 6.0,
    length: 2.5,
    defaultSeats: 0,
    description: "Raised platform for worship band, choir, and preachers.",
  },
  {
    type: "podium",
    label: "Pulpit / Podium",
    category: "church",
    width: 1.0,
    length: 0.8,
    defaultSeats: 0,
    description: "Speaker lectern / teaching pulpit.",
  },
  {
    type: "sound_booth",
    label: "Sound / AV Booth",
    category: "church",
    width: 3.0,
    length: 1.5,
    defaultSeats: 0,
    description: "Audio mixing console, livestream station & lighting control.",
  },

  // Seating
  {
    type: "chair_row",
    label: "Chair Block (5x4 = 20 seats)",
    category: "seating",
    width: 2.5,
    length: 3.5,
    defaultSeats: 20,
    chairsPerRow: 5,
    rowCount: 4,
    description: "Interlocking padded sanctuary chairs.",
  },
  {
    type: "chair_row",
    label: "Single Chair Row (6 seats)",
    category: "seating",
    width: 3.0,
    length: 0.9,
    defaultSeats: 6,
    chairsPerRow: 6,
    rowCount: 1,
    description: "Single row of 6 chairs with standard spacing.",
  },

  // Tables
  {
    type: "round_table",
    label: '60" Round Table (8 seats)',
    category: "tables",
    width: 2.4,
    length: 2.4,
    defaultSeats: 8,
    tableDiameterInches: 60,
    description: 'Standard 5ft banquet round table with 8 chairs.',
  },
  {
    type: "round_table",
    label: '48" Round Table (6 seats)',
    category: "tables",
    width: 2.0,
    length: 2.0,
    defaultSeats: 6,
    tableDiameterInches: 48,
    description: '4ft round table with 6 chairs for small group discussion.',
  },
  {
    type: "round_table",
    label: '72" Round Table (10 seats)',
    category: "tables",
    width: 2.8,
    length: 2.8,
    defaultSeats: 10,
    tableDiameterInches: 72,
    description: 'Large 6ft round banquet table with 10 chairs.',
  },
  {
    type: "rect_table",
    label: 'Classroom Table 30"×96" (3 seats)',
    category: "tables",
    width: 2.44,
    length: 0.9,
    defaultSeats: 3,
    tableDimensionsInches: "30x96",
    description: '8ft training seminar table with 3 chairs facing one side.',
  },
  {
    type: "rect_table",
    label: 'Classroom Table 30"×72" (2-3 seats)',
    category: "tables",
    width: 1.83,
    length: 0.9,
    defaultSeats: 2,
    tableDimensionsInches: "30x72",
    description: '6ft training seminar table with 2 chairs facing one side.',
  },

  // Architectural
  {
    type: "aisle",
    label: "Aisle / Walkway",
    category: "architectural",
    width: 1.5,
    length: 5.0,
    defaultSeats: 0,
    description: "Clear aisle path demarcating safe movement & emergency egress.",
  },
  {
    type: "pillar",
    label: "Structural Pillar",
    category: "architectural",
    width: 0.8,
    length: 0.8,
    defaultSeats: 0,
    description: "Architectural support column or load-bearing pillar.",
  },
  {
    type: "door",
    label: "Entry Door Marker",
    category: "architectural",
    width: 1.2,
    length: 0.4,
    defaultSeats: 0,
    description: "Sanctuary entrance / exit doorway.",
  },
];

export function calculateSeats(element: LayoutElement): number {
  if (element.type === "chair_row") {
    const chairs = element.chairsPerRow ?? 5;
    const rows = element.rowCount ?? 1;
    return chairs * rows;
  }
  if (element.type === "round_table") {
    if (element.seats !== undefined) return element.seats;
    switch (element.tableDiameterInches) {
      case 36:
        return 4;
      case 48:
        return 6;
      case 60:
        return 8;
      case 72:
        return 10;
      default:
        return 8;
    }
  }
  if (element.type === "rect_table") {
    if (element.seats !== undefined) return element.seats;
    return element.tableDimensionsInches === "30x96" ? 3 : 2;
  }
  return 0;
}
