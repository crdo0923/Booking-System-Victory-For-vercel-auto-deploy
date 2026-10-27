import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, getDay, getDaysInMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface MonthCalendarProps {
  selected: string;
  first: string;
  last: string;
  hrefFor: (dateKey: string) => string;
  availabilityByDate?: Record<string, { entries: { label: string; kind: "booked" | "unavailable" }[] }>;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const keyOf = (year: number, monthIndex: number, day: number) => format(new Date(year, monthIndex, day), "yyyy-MM-dd");

/** Server-rendered month grid; each day is a link, so it works without client JavaScript. */
export function MonthCalendar({ selected, first, last, hrefFor, availabilityByDate = {} }: MonthCalendarProps) {
  const [year, month] = selected.split("-").map(Number);
  const monthIndex = month - 1;
  const monthStart = new Date(year, monthIndex, 1);
  const days = getDaysInMonth(monthStart);
  const leading = getDay(monthStart);

  const prevLastDay = keyOf(year, monthIndex, 0);
  const prevTarget = prevLastDay >= first ? (keyOf(year, monthIndex - 1, 1) < first ? first : keyOf(year, monthIndex - 1, 1)) : null;
  const nextFirstDay = keyOf(year, monthIndex + 1, 1);
  const nextTarget = nextFirstDay <= last ? nextFirstDay : null;

  const navClass = "flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-extrabold" aria-live="polite">
          {format(monthStart, "MMMM yyyy")}
        </h3>
        <div className="flex gap-1">
          {prevTarget ? (
            <Link href={hrefFor(prevTarget)} scroll={false} className={navClass} aria-label="Previous month">
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className={cn(navClass, "pointer-events-none opacity-30")} aria-hidden>
              <ChevronLeft className="size-4" />
            </span>
          )}
          {nextTarget ? (
            <Link href={hrefFor(nextTarget)} scroll={false} className={navClass} aria-label="Next month">
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className={cn(navClass, "pointer-events-none opacity-30")} aria-hidden>
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className="pb-2 text-[11px] font-bold text-subtle" aria-hidden>
            {day}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const dateKey = keyOf(year, monthIndex, i + 1);
          const isSelected = dateKey === selected;
          const isToday = dateKey === first;
          const disabled = dateKey < first || dateKey > last;
          const entries = availabilityByDate[dateKey]?.entries ?? [];
          const label = format(new Date(year, monthIndex, i + 1), "EEEE, d MMMM");
          const base = "relative mx-auto flex size-10 items-center justify-center rounded-full text-sm tabular-nums";

          if (disabled) {
            return (
              <span key={dateKey} className={cn(base, "text-line-strong")} aria-label={`${label}, unavailable`}>
                <span>{i + 1}</span>
              </span>
            );
          }
          return (
            <Link
              key={dateKey}
              href={hrefFor(dateKey)}
              scroll={false}
              aria-label={`${label}${entries.length > 0 ? `, ${entries.map((entry) => `${entry.kind} ${entry.label}`).join(", ")}` : ""}`}
              aria-current={isSelected ? "date" : undefined}
              title={entries.length > 0 ? entries.map((entry) => `${entry.kind === "booked" ? "Booked" : "Unavailable"} · ${entry.label}`).join("\n") : undefined}
              className={cn(
                base,
                "group font-bold transition-colors",
                isSelected ? "bg-brand text-white" : "text-ink hover:bg-sunken",
              )}
            >
              {i + 1}
              {entries.length > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1.5 size-1.5 rounded-full",
                    isSelected ? "bg-white" : "bg-accent",
                  )}
                  aria-hidden
                />
              )}
              {entries.length > 0 && (
                <span
                  role="tooltip"
                  className={cn(
                    "pointer-events-none absolute top-full left-1/2 z-20 mt-2 hidden w-max max-w-48 -translate-x-1/2 rounded-md bg-ink px-2.5 py-2 text-left text-[11px] font-medium leading-4 text-white shadow-lg",
                    "group-hover:block group-focus-visible:block",
                  )}
                >
                  <span className="block font-bold">{label}</span>
                  {entries.map((entry) => (
                    <span key={`tooltip-${entry.kind}-${entry.label}`} className="block">
                      {entry.kind === "booked" ? "Booked" : "Unavailable"} · {entry.label}
                    </span>
                  ))}
                </span>
              )}
              {isToday && entries.length === 0 && (
                <span className={cn("absolute bottom-1 size-1 rounded-full", isSelected ? "bg-white" : "bg-accent")} aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-line-strong" aria-hidden />
          Unavailable
        </span>
      </p>
    </div>
  );
}
