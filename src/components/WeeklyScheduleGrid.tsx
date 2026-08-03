import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, CheckCircle2, User, Clock, Info, ShieldAlert, LayoutGrid, ListFilter 
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { YogaClass } from './ClassDetailModal';

interface WeeklyScheduleGridProps {
  classes: YogaClass[];
  bookings: Record<string, any[]>;
  userBookedIds: Set<string>;
  userData: any;
  onSelectClass: (c: YogaClass) => void;
  onCreateClassAt: (dateTimeIso: string) => void;
  timeFilter: 'all' | 'morning' | 'afternoon';
}

const COLOR_PALETTES = [
  { bg: 'bg-amber-500/25 hover:bg-amber-500/40', border: 'border-amber-500/70', text: 'text-amber-300', badgeBg: 'bg-amber-500 text-black', glow: 'shadow-amber-500/20' },
  { bg: 'bg-yellow-400/25 hover:bg-yellow-400/40', border: 'border-yellow-400/70', text: 'text-yellow-300', badgeBg: 'bg-yellow-400 text-black', glow: 'shadow-yellow-400/20' },
  { bg: 'bg-emerald-500/25 hover:bg-emerald-500/40', border: 'border-emerald-500/70', text: 'text-emerald-300', badgeBg: 'bg-emerald-500 text-black', glow: 'shadow-emerald-500/20' },
  { bg: 'bg-indigo-500/25 hover:bg-indigo-500/40', border: 'border-indigo-500/70', text: 'text-indigo-300', badgeBg: 'bg-indigo-500 text-white', glow: 'shadow-indigo-500/20' },
  { bg: 'bg-cyan-500/25 hover:bg-cyan-500/40', border: 'border-cyan-500/70', text: 'text-cyan-300', badgeBg: 'bg-cyan-500 text-black', glow: 'shadow-cyan-500/20' },
  { bg: 'bg-rose-500/25 hover:bg-rose-500/40', border: 'border-rose-500/70', text: 'text-rose-300', badgeBg: 'bg-rose-500 text-white', glow: 'shadow-rose-500/20' },
  { bg: 'bg-purple-500/25 hover:bg-purple-500/40', border: 'border-purple-500/70', text: 'text-purple-300', badgeBg: 'bg-purple-500 text-white', glow: 'shadow-purple-500/20' },
  { bg: 'bg-teal-400/25 hover:bg-teal-400/40', border: 'border-teal-400/70', text: 'text-teal-300', badgeBg: 'bg-teal-400 text-black', glow: 'shadow-teal-400/20' },
  { bg: 'bg-orange-500/25 hover:bg-orange-500/40', border: 'border-orange-500/70', text: 'text-orange-300', badgeBg: 'bg-orange-500 text-black', glow: 'shadow-orange-500/20' },
  { bg: 'bg-sky-400/25 hover:bg-sky-400/40', border: 'border-sky-400/70', text: 'text-sky-300', badgeBg: 'bg-sky-400 text-black', glow: 'shadow-sky-400/20' },
];

// Map class names to distinct colors & abbreviations (matching Image 2)
export function getClassStyle(title: string) {
  const cleanTitle = (title || 'Yoga').trim();
  const lower = cleanTitle.toLowerCase();
  
  if (lower.includes('warrior') || lower.startsWith('w')) {
    return { letter: 'W', ...COLOR_PALETTES[0] };
  }
  if (lower.includes('dancer') || lower.startsWith('d')) {
    return { letter: 'D', ...COLOR_PALETTES[1] };
  }
  if (lower.includes('animal') || lower.startsWith('a')) {
    return { letter: 'A', ...COLOR_PALETTES[2] };
  }
  if (lower.includes('espejo') || lower.startsWith('e')) {
    return { letter: 'E', ...COLOR_PALETTES[3] };
  }
  if (lower.includes('mente') || lower.includes('buda') || lower.startsWith('b')) {
    return { letter: 'B', ...COLOR_PALETTES[4] };
  }

  // Dynamic style calculation for any custom class title written by admin/instructor
  const letter = cleanTitle.charAt(0).toUpperCase() || 'Y';
  let hash = 0;
  for (let i = 0; i < cleanTitle.length; i++) {
    hash = cleanTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  const paletteIndex = Math.abs(hash) % COLOR_PALETTES.length;
  const palette = COLOR_PALETTES[paletteIndex];

  return {
    letter,
    ...palette
  };
}

export function WeeklyScheduleGrid({
  classes,
  bookings,
  userBookedIds,
  userData,
  onSelectClass,
  onCreateClassAt,
  timeFilter,
}: WeeklyScheduleGridProps) {
  // Current Monday of the week being viewed
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  // Selected Day Index for Mobile View (0 = Lun, 6 = Dom). Defaults to today's day index if in current week
  const [selectedMobileDayIndex, setSelectedMobileDayIndex] = useState<number>(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday
    return day === 0 ? 6 : day - 1;
  });

  // Mobile layout view mode toggle ('day' = Agenda por día en móvil, 'table' = Tabla completa)
  const [mobileLayoutMode, setMobileLayoutMode] = useState<'day' | 'table'>('day');

  const isAdminOrInstructor = userData?.role === 'admin' || userData?.role === 'instructor' || userData?.role === 'superadmin';

  // Calculate the 7 days (Monday to Sunday) for the selected week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentMonday, i));
  }, [currentMonday]);

  // Standard time slots (matching reference image)
  const defaultTimeSlots = [
    '07:00', '08:00', '08:30', '09:00', '10:00',
    '17:00', '17:30', '18:30', '19:00'
  ];

  // Extract all time slots present in actual classes to make sure none are omitted
  const timeSlots = useMemo(() => {
    const slots = new Set<string>(defaultTimeSlots);
    
    classes.forEach(c => {
      if (!c.date) return;
      const d = new Date(c.date);
      const hour = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      slots.add(`${hour}:${min}`);
    });

    const sorted = Array.from(slots).sort((a, b) => {
      const [hA, mA] = a.split(':').map(Number);
      const [hB, mB] = b.split(':').map(Number);
      return (hA * 60 + mA) - (hB * 60 + mB);
    });

    // Apply morning / afternoon filter
    return sorted.filter(slot => {
      const hour = parseInt(slot.split(':')[0], 10);
      if (timeFilter === 'morning') return hour < 12;
      if (timeFilter === 'afternoon') return hour >= 12;
      return true;
    });
  }, [classes, timeFilter]);

  // Extract unique class types dynamically from active classes written by admin/instructor
  const legendItems = useMemo(() => {
    const map = new Map<string, { letter: string; title: string; style: ReturnType<typeof getClassStyle> }>();
    
    if (classes.length > 0) {
      classes.forEach(c => {
        if (!c.title || !c.title.trim()) return;
        const trimmedTitle = c.title.trim();
        const key = trimmedTitle.toLowerCase();
        if (!map.has(key)) {
          const style = getClassStyle(trimmedTitle);
          map.set(key, { letter: style.letter, title: trimmedTitle, style });
        }
      });
    } else {
      // Default reference fallback if no classes exist yet
      const defaults = [
        'Warrior Vinyasa',
        'Dancer Vinyasa',
        'Animal Vinyasa',
        'Espejo del Sabio',
        'Mente de Buda'
      ];
      defaults.forEach(title => {
        const style = getClassStyle(title);
        map.set(title.toLowerCase(), { letter: style.letter, title, style });
      });
    }

    return Array.from(map.values());
  }, [classes]);

  // Helper to find classes for a specific day and time slot
  const getClassesForSlot = (day: Date, slotTimeStr: string) => {
    return classes.filter(c => {
      if (!c.date) return false;
      const d = new Date(c.date);
      
      const isSameDate = isSameDay(d, day);
      if (!isSameDate) return false;

      const hour = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const classSlot = `${hour}:${min}`;

      return classSlot === slotTimeStr;
    });
  };

  // Week navigation handlers
  const handlePrevWeek = () => setCurrentMonday(prev => addDays(prev, -7));
  const handleNextWeek = () => setCurrentMonday(prev => addDays(prev, 7));
  const handleToday = () => {
    const todayMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
    setCurrentMonday(todayMonday);
    const day = new Date().getDay();
    setSelectedMobileDayIndex(day === 0 ? 6 : day - 1);
  };

  const sunday = addDays(currentMonday, 6);
  const dateRangeText = `del ${format(currentMonday, "dd", { locale: es })} al ${format(sunday, "dd 'de' MMMM", { locale: es })}`;

  // Selected Day for mobile single-day agenda view
  const activeMobileDay = weekDays[selectedMobileDayIndex];

  return (
    <div className="w-full space-y-6">
      {/* HEADER & WEEK NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141416] p-4 sm:p-6 rounded-3xl border border-[#4a2e1b]/40 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-salvia animate-pulse"></span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-salvia">Calendario Interactivo</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white capitalize mt-1">
            Horarios de clase {dateRangeText}
          </h2>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={handlePrevWeek}
            className="flex items-center justify-center p-2.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-salvia hover:text-black transition-all cursor-pointer"
            title="Semana Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            Esta Semana
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="flex items-center justify-center p-2.5 rounded-full bg-white/5 border border-white/10 text-white hover:bg-salvia hover:text-black transition-all cursor-pointer"
            title="Semana Siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MOBILE DISPLAY CONTROLS & DAY SELECTOR TABS (Visible on Mobile Screens) */}
      <div className="block md:hidden space-y-4">
        {/* Toggle between Mobile Day Agenda View and Full Table Grid */}
        <div className="flex items-center justify-between bg-[#121214] p-2 rounded-2xl border border-white/10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 pl-2">Vista Móvil:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMobileLayoutMode('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                mobileLayoutMode === 'day' 
                  ? 'bg-salvia text-black shadow-md' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" /> Agenda Día
            </button>
            <button
              type="button"
              onClick={() => setMobileLayoutMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                mobileLayoutMode === 'table' 
                  ? 'bg-salvia text-black shadow-md' 
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Tabla Grid
            </button>
          </div>
        </div>

        {/* Horizontal Mobile Days Selector Tabs */}
        {mobileLayoutMode === 'day' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {weekDays.map((day, idx) => {
              const isSelected = selectedMobileDayIndex === idx;
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedMobileDayIndex(idx)}
                  className={`flex-1 min-w-[62px] py-2.5 px-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center ${
                    isSelected
                      ? 'bg-salvia text-black border-salvia font-black shadow-lg scale-105'
                      : isCurrentDay
                        ? 'bg-salvia/20 text-salvia border-salvia/50 font-bold'
                        : 'bg-[#141416] text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    {format(day, "EEE", { locale: es })}
                  </span>
                  <span className="text-sm font-serif font-bold mt-0.5">
                    {format(day, "d", { locale: es })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* LEGEND BAR (Matching Image 2 Reference) */}
      <div className="bg-[#121214] p-4 sm:p-5 rounded-3xl border border-white/10 shadow-lg">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 block mb-3">
          Leyenda de Clases:
        </span>
        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2.5">
          {legendItems.map((item) => (
            <div key={item.title} className="flex items-center gap-2">
              <span className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs font-black font-serif border ${item.style.border} ${item.style.badgeBg} shadow-sm`}>
                {item.letter}
              </span>
              <span className="text-xs font-medium text-white/90">
                :{item.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ADMIN HELPER BANNER */}
      {isAdminOrInstructor && (
        <div className="bg-salvia/10 border border-salvia/30 rounded-2xl p-4 flex items-start sm:items-center gap-3 text-xs text-salvia">
          <Info className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Modo Edición Activado:</strong> Haz clic en cualquier recuadro pintado para ver/editar/eliminar una clase. Haz clic en un espacio vacío para crear una nueva clase.
          </span>
        </div>
      )}

      {/* MOBILE DAY AGENDA VIEW (Rendered on mobile screens when mobileLayoutMode === 'day') */}
      <div className="block md:hidden">
        {mobileLayoutMode === 'day' && (
          <div className="space-y-3 bg-[#0c0c0e] p-4 rounded-3xl border-4 border-[#4a2e1b] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <span className="text-sm font-serif font-bold text-white capitalize">
                {format(activeMobileDay, "EEEE d 'de' MMMM", { locale: es })}
              </span>
              {isToday(activeMobileDay) && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-black bg-salvia px-2.5 py-0.5 rounded-full">
                  Hoy
                </span>
              )}
            </div>

            {timeSlots.length > 0 ? (
              timeSlots.map((slot) => {
                const slotClasses = getClassesForSlot(activeMobileDay, slot);

                // Build ISO string for creating class in empty cell
                const [h, m] = slot.split(':').map(Number);
                const cellDate = new Date(activeMobileDay);
                cellDate.setHours(h, m, 0, 0);

                const tzoffset = cellDate.getTimezoneOffset() * 60000;
                const localIso = new Date(cellDate.getTime() - tzoffset).toISOString().slice(0, 16);

                return (
                  <div key={slot} className="flex gap-3 items-stretch border-b border-white/5 pb-3 last:border-b-0">
                    {/* Time Slot Badge */}
                    <div className="w-16 shrink-0 flex items-center justify-center font-mono text-xs font-bold text-amber-300 bg-black/40 border border-white/10 rounded-2xl px-2 py-3">
                      {slot}
                    </div>

                    {/* Classes or Empty Slot */}
                    <div className="flex-1 space-y-2">
                      {slotClasses.length > 0 ? (
                        slotClasses.map((c) => {
                          const style = getClassStyle(c.title);
                          const isBooked = userBookedIds.has(c.id);
                          const spotsTaken = bookings[c.id]?.length || 0;
                          const spotsAvailable = c.capacity - spotsTaken;
                          const isFull = spotsAvailable <= 0;

                          return (
                            <motion.div
                              key={c.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => onSelectClass(c)}
                              className={`relative rounded-2xl p-3 border-2 ${style.border} ${style.bg} shadow-md transition-all cursor-pointer flex items-center justify-between`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black font-serif border ${style.border} ${style.badgeBg} shadow-sm`}>
                                  {style.letter}
                                </span>
                                <div>
                                  <h4 className="text-xs font-bold text-white leading-tight">
                                    {c.title}
                                  </h4>
                                  <p className="text-[10px] text-white/70 italic mt-0.5">
                                    {c.instructor ? `${c.instructor} • ` : ''}{c.duration} min
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                {isBooked && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-black bg-salvia px-2 py-0.5 rounded-full flex items-center gap-1">
                                    ✓ Reservado
                                  </span>
                                )}
                                <span className={`text-[10px] font-semibold ${isFull ? 'text-red-400' : 'text-salvia'}`}>
                                  {isFull ? 'Agotado' : `${spotsAvailable}/${c.capacity} cupos`}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div
                          onClick={() => {
                            if (isAdminOrInstructor) {
                              onCreateClassAt(localIso);
                            }
                          }}
                          className={`h-full min-h-[44px] rounded-2xl border border-dashed flex items-center justify-center ${
                            isAdminOrInstructor
                              ? 'border-white/15 bg-white/5 text-salvia text-xs font-semibold cursor-pointer active:bg-salvia/20'
                              : 'border-transparent text-white/20 text-[10px]'
                          }`}
                        >
                          {isAdminOrInstructor ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
                              <Plus className="w-3.5 h-3.5" /> Crear Clase en {slot}
                            </span>
                          ) : (
                            <span className="text-[11px] italic text-white/30">Sin clase programada</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-white/40 text-xs">
                No hay clases disponibles en este horario.
              </div>
            )}
          </div>
        )}
      </div>

      {/* FULL WEEKLY GRID TABLE (Visible on Desktop OR on Mobile when layout mode is 'table') */}
      <div className={`overflow-x-auto rounded-3xl border-4 border-[#4a2e1b] bg-[#0c0c0e] shadow-2xl no-scrollbar ${
        mobileLayoutMode === 'day' ? 'hidden md:block' : 'block'
      }`}>
        <div className="min-w-[768px]">
          {/* HEADER ROW: TIME / DAYS */}
          <div className="grid grid-cols-8 border-b-2 border-white/15 bg-[#18181b]">
            {/* Time Slot Header Column */}
            <div className="p-4 flex items-center justify-center text-center font-bold text-[10px] uppercase tracking-widest text-white/40 border-r border-white/10">
              <Clock className="w-3.5 h-3.5 mr-1" /> Hora
            </div>

            {/* 7 Days Headers */}
            {weekDays.map((day) => {
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 text-center border-r border-white/10 last:border-r-0 flex flex-col justify-center transition-colors ${
                    isCurrentDay ? 'bg-salvia/20 text-salvia font-black' : 'text-white/80'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    {format(day, "EEE", { locale: es })}
                  </span>
                  <span className={`text-sm font-serif ${isCurrentDay ? 'text-salvia font-bold' : 'text-white/60'}`}>
                    {format(day, "d MMM", { locale: es })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* GRID BODY: TIME ROWS */}
          {timeSlots.length > 0 ? (
            timeSlots.map((slot) => {
              const isMorningSlot = parseInt(slot.split(':')[0], 10) < 12;

              return (
                <div
                  key={slot}
                  className="grid grid-cols-8 border-b border-white/10 min-h-[72px]"
                >
                  {/* Time Label Cell */}
                  <div className={`p-3 flex items-center justify-center font-mono text-xs font-bold border-r border-white/10 select-none ${
                    isMorningSlot ? 'bg-amber-500/10 text-amber-300' : 'bg-indigo-500/10 text-indigo-300'
                  }`}>
                    <span className="px-2 py-1 rounded-lg bg-black/40 border border-white/10">
                      {slot}
                    </span>
                  </div>

                  {/* 7 Day Slot Cells */}
                  {weekDays.map((day) => {
                    const slotClasses = getClassesForSlot(day, slot);
                    const isCurrentDay = isToday(day);

                    // Build ISO string for creating class in empty cell
                    const [h, m] = slot.split(':').map(Number);
                    const cellDate = new Date(day);
                    cellDate.setHours(h, m, 0, 0);

                    // Local ISO string for datetime-local
                    const tzoffset = cellDate.getTimezoneOffset() * 60000;
                    const localIso = new Date(cellDate.getTime() - tzoffset).toISOString().slice(0, 16);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`p-1.5 border-r border-white/10 last:border-r-0 relative transition-colors ${
                          isCurrentDay ? 'bg-salvia/5' : 'bg-transparent'
                        }`}
                      >
                        {slotClasses.length > 0 ? (
                          /* POPULATED CLASS BOX(ES) */
                          <div className="space-y-1.5 h-full">
                            {slotClasses.map((c) => {
                              const style = getClassStyle(c.title);
                              const isBooked = userBookedIds.has(c.id);
                              const spotsTaken = bookings[c.id]?.length || 0;
                              const spotsAvailable = c.capacity - spotsTaken;
                              const isFull = spotsAvailable <= 0;

                              return (
                                <motion.div
                                  key={c.id}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => onSelectClass(c)}
                                  className={`relative h-full min-h-[60px] rounded-2xl p-2.5 border-2 ${style.border} ${style.bg} ${style.glow} shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group`}
                                >
                                  {/* User Booked Pill Indicator */}
                                  {isBooked && (
                                    <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-salvia text-black">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2">
                                    {/* Class Stylized Letter Badge */}
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black font-serif border ${style.border} ${style.badgeBg} shadow-sm`}>
                                      {style.letter}
                                    </span>

                                    <div className="truncate">
                                      <h4 className="text-xs font-bold text-white truncate group-hover:text-salvia transition-colors">
                                        {c.title}
                                      </h4>
                                      {c.instructor && (
                                        <p className="text-[10px] text-white/70 italic truncate">
                                          {c.instructor}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Footer Info inside Cell */}
                                  <div className="flex items-center justify-between mt-1 text-[9px] font-semibold">
                                    <span className="text-white/60">
                                      {c.duration}m
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded-full ${isFull ? 'bg-red-500/20 text-red-400' : 'bg-black/40 text-salvia'}`}>
                                      {isFull ? 'Lleno' : `${spotsAvailable}/${c.capacity}`}
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        ) : (
                          /* EMPTY CELL SLOT */
                          <div
                            onClick={() => {
                              if (isAdminOrInstructor) {
                                onCreateClassAt(localIso);
                              }
                            }}
                            className={`h-full min-h-[58px] rounded-2xl border border-dashed transition-all flex items-center justify-center ${
                              isAdminOrInstructor
                                ? 'border-white/10 hover:border-salvia/60 hover:bg-salvia/10 cursor-pointer group'
                                : 'border-transparent'
                            }`}
                          >
                            {isAdminOrInstructor && (
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase tracking-wider text-salvia flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Agregar
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-white/50">
              No hay horarios disponibles para el filtro de tiempo seleccionado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
