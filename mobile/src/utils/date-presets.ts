import { DateTime } from "luxon";

export type DatePreset =
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "thisYear"
  | "allTime";

export const DATE_PRESETS: DatePreset[] = [
  "thisMonth",
  "lastMonth",
  "last3Months",
  "thisYear",
  "allTime",
];

export const getDateRange = (
  preset: DatePreset,
): { from: string | undefined; to: string | undefined } => {
  const now = DateTime.now();
  switch (preset) {
    case "thisMonth":
      return { from: now.startOf("month").toISODate()!, to: now.toISODate()! };
    case "lastMonth": {
      const lastMonth = now.minus({ months: 1 });
      return {
        from: lastMonth.startOf("month").toISODate()!,
        to: lastMonth.endOf("month").toISODate()!,
      };
    }
    case "last3Months":
      return {
        from: now.minus({ months: 2 }).startOf("month").toISODate()!,
        to: now.toISODate()!,
      };
    case "thisYear":
      return { from: now.startOf("year").toISODate()!, to: now.toISODate()! };
    case "allTime":
      return { from: undefined, to: undefined };
  }
};
