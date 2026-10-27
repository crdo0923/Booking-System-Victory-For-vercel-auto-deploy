"use client";

import { useState } from "react";
import { DayPicker } from "react-day-picker";
import { addMonths, format, parseISO } from "date-fns";

interface ShuttleDatePickerProps {
  today: string;
}

export function ShuttleDatePicker({ today }: ShuttleDatePickerProps) {
  const [dates, setDates] = useState<Date[]>([]);
  const todayDate = parseISO(today);

  return (
    <div className="w-full max-w-[40rem] rounded-lg border border-line bg-surface p-2.5 sm:p-3">
      <DayPicker
        mode="multiple"
        selected={dates}
        onSelect={(selected) => setDates(selected ?? [])}
        defaultMonth={todayDate}
        startMonth={todayDate}
        endMonth={addMonths(todayDate, 12)}
        disabled={{ before: todayDate }}
        showOutsideDays
        fixedWeeks
        classNames={{
          root: "relative w-full text-sm",
          months: "relative",
          month: "space-y-2",
          month_caption: "flex h-8 items-center px-1",
          caption_label: "text-[15px] font-extrabold text-ink",
          nav: "absolute top-0 right-0 flex h-8 items-center gap-0.5",
          button_previous: "inline-flex size-7 items-center justify-center rounded-md text-ink-soft hover:bg-sunken disabled:opacity-30",
          button_next: "inline-flex size-7 items-center justify-center rounded-md text-ink-soft hover:bg-sunken disabled:opacity-30",
          chevron: "size-4 fill-current",
          month_grid: "w-full border-collapse",
          weekdays: "",
          weekday: "h-7 text-center text-[10px] font-bold uppercase tracking-wide text-muted",
          week: "",
          day: "p-0 text-center",
          day_button:
            "mx-auto flex size-8 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
          selected: "[&>button]:bg-brand [&>button]:font-bold [&>button]:text-white [&>button]:hover:bg-brand-hover",
          today: "[&>button]:font-extrabold [&>button]:text-brand [&[aria-selected=true]>button]:text-white",
          outside: "[&>button]:text-subtle",
          disabled: "[&>button]:pointer-events-none [&>button]:text-subtle [&>button]:opacity-40",
          hidden: "invisible",
        }}
      />
      <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">
        Select one or more travel dates. {dates.length > 0 ? `${dates.length} selected.` : "No dates selected yet."}
      </p>
      <input type="hidden" name="dates" value={dates.map((date) => format(date, "yyyy-MM-dd")).join(",")} required />
    </div>
  );
}
