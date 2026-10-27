import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface WeekCalendarProps {
  selected: string;
  first: string;
  last: string;
  availabilityByDate: Record<string, { booked: string[]; unavailable: string[] }>;
  hrefFor: (dateKey: string) => string;
}

const toDate = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const toKey = (date: Date) => format(date, "yyyy-MM-dd");

export function WeekCalendar({ selected, first, last, availabilityByDate, hrefFor }: WeekCalendarProps) {
  const selectedDate = toDate(selected);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateKey = toKey(date);
    return { date, dateKey, entries: availabilityByDate[dateKey] };
  });

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line bg-sunken/50">
        {days.map(({ date, dateKey }) => {
          const disabled = dateKey < first || dateKey > last;
          const isSelected = dateKey === selected;
          return (
            <Link
              key={dateKey}
              href={disabled ? "#" : hrefFor(dateKey)}
              scroll={false}
              aria-current={isSelected ? "date" : undefined}
              aria-label={format(date, "EEEE, d MMMM")}
              className={cn(
                "min-w-0 border-r border-line px-2 py-3 text-center last:border-r-0",
                disabled && "pointer-events-none text-subtle",
                isSelected ? "bg-brand text-white" : "text-ink hover:bg-sunken",
              )}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wide opacity-75">{format(date, "EEE")}</span>
              <span className="mt-1 block text-lg font-extrabold tabular-nums">{format(date, "d")}</span>
              {dateKey === first && <span className="mx-auto mt-1 block size-1 rounded-full bg-accent" aria-label="Today" />}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-7 divide-x divide-line">
        {days.map(({ dateKey, entries }) => {
          const isSelected = dateKey === selected;
          const hasEntries = Boolean(entries && (entries.booked.length > 0 || entries.unavailable.length > 0));
          return (
            <div key={dateKey} className={cn("min-h-36 p-2", isSelected && "bg-brand-tint/30")}>
              {!hasEntries ? (
                <span className="text-xs text-subtle">No blocked times</span>
              ) : (
                <div className="space-y-1.5">
                  {entries.booked.map((label) => (
                    <span
                      key={`booked-${label}`}
                      className="block truncate rounded bg-accent/15 px-1.5 py-1 text-[10px] font-semibold leading-3 text-accent-deep"
                      title={`Booked · ${label}`}
                    >
                      Booked
                      <span className="sr-only"> · {label}</span>
                    </span>
                  ))}
                  {entries.unavailable.map((label) => (
                    <span
                      key={`unavailable-${label}`}
                      className="block truncate rounded bg-sunken px-1.5 py-1 text-[10px] font-semibold leading-3 text-muted"
                      title={`Unavailable · ${label}`}
                    >
                      Unavailable
                      <span className="sr-only"> · {label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="border-t border-line px-3 py-2 text-xs text-muted">Booked times are shown without event or requester details.</p>
    </div>
  );
}
