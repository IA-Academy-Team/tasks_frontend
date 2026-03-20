/**
 * Filtro de rango de fechas (estilo PQRSF).
 * Incluye formateo legible y popover con calendario.
 */

import { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

// ---------------------------------------------------------------------------
// Utilidad: formatear YYYY-MM-DD a texto corto legible (ej: 28 ene 2026)
// ---------------------------------------------------------------------------

export function formatDateLabel(isoDate?: string) {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Rango compacto: mismo mes/año → "4 — 12 de feb de 2026"; si no, muestra cada fecha con mes/año donde haga falta. */
function formatRangeLabel(from?: string, to?: string) {
  if (!from || !to) return '';
  const dFrom = new Date(from + 'T12:00:00');
  const dTo = new Date(to + 'T12:00:00');
  if (Number.isNaN(dFrom.getTime()) || Number.isNaN(dTo.getTime())) {
    return `${formatDateLabel(from)} — ${formatDateLabel(to)}`;
  }
  const sameYear = dFrom.getFullYear() === dTo.getFullYear();
  const sameMonth = sameYear && dFrom.getMonth() === dTo.getMonth();
  const dayFrom = dFrom.getDate();
  const dayTo = dTo.getDate();
  const monthShort = dFrom.toLocaleDateString('es-ES', { month: 'short' });
  const year = dFrom.getFullYear();
  if (sameMonth && sameYear) {
    return `${dayFrom} — ${dayTo} de ${monthShort} de ${year}`;
  }
  if (sameYear) {
    const shortFrom = dFrom.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const shortTo = dTo.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${shortFrom} — ${shortTo}`;
  }
  return `${formatDateLabel(from)} — ${formatDateLabel(to)}`;
}

// ---------------------------------------------------------------------------
// Componente de filtro de rango de fechas
// ---------------------------------------------------------------------------

type DateRangeFilterProps = {
  dateFrom?: string;
  dateTo?: string;
  onDateChange: (from: string, to: string) => void;
  className?: string;
  placeholder?: string;
  /** Clases adicionales para el botón disparador (ej. w-full para igualar ancho en flex). */
  triggerClassName?: string;
};

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateChange,
  className = '',
  placeholder = 'Rango de fechas (desde — hasta)',
  triggerClassName = '',
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const startDate = dateFrom ? new Date(dateFrom + 'T12:00:00') : null;
  const endDate = dateTo ? new Date(dateTo + 'T12:00:00') : null;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (dates: [Date | null, Date | null] | null) => {
    const [start, end] = dates || [null, null];
    const from = start ? start.toISOString().split('T')[0] ?? '' : '';
    const to = end ? end.toISOString().split('T')[0] ?? '' : '';
    onDateChange(from, to);
  };

  const label =
    dateFrom && dateTo
      ? formatRangeLabel(dateFrom, dateTo)
      : dateFrom
        ? `Desde ${formatDateLabel(dateFrom)}`
        : placeholder;

  return (
    <div className={`relative ${open ? "z-[90]" : "z-auto"} ${className}`} ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`app-control inline-flex h-10 items-center gap-2 rounded-xl px-2.5 text-left min-w-0 truncate w-full ${triggerClassName} ${
          !dateFrom && !dateTo ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        <CalendarIcon className="size-4 shrink-0 text-primary" />
        <span className="truncate">{label}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[999] mt-2">
          <DatePicker
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(dates) => handleSelect(dates as [Date | null, Date | null] | null)}
            monthsShown={1}
            inline
            dateFormat="dd/MM/yyyy"
            locale={es}
            calendarClassName="app-datepicker"
          />
        </div>
      )}
    </div>
  );
}

export default DateRangeFilter;
