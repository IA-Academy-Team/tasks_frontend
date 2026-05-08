const trimTrailingZeros = (value: string) => value.replace(/\.?0+$/, "");

export const minutesToHours = (minutes: number | null | undefined): number | null => {
  if (minutes === null || minutes === undefined) return null;
  return Math.round((minutes / 60) * 100) / 100;
};

export const hoursToMinutes = (hours: number): number => Math.round(hours * 60);

export const formatHoursFromMinutes = (
  minutes: number | null | undefined,
  options: { empty?: string; signed?: boolean; suffix?: string } = {},
): string => {
  if (minutes === null || minutes === undefined) return options.empty ?? "-";

  const hours = minutesToHours(minutes) ?? 0;
  if (hours === 0) return `0${options.suffix ?? " h"}`;

  const absoluteValue = Math.abs(hours);
  const formattedValue = Number.isInteger(absoluteValue)
    ? String(absoluteValue)
    : trimTrailingZeros(absoluteValue.toFixed(2));
  const sign = options.signed ? (hours > 0 ? "+" : "-") : "";

  return `${sign}${formattedValue}${options.suffix ?? " h"}`;
};

export const formatHoursInputFromMinutes = (minutes: number | null | undefined): string => {
  const hours = minutesToHours(minutes);
  if (hours === null || hours <= 0) return "";
  return Number.isInteger(hours) ? String(hours) : trimTrailingZeros(hours.toFixed(2));
};
