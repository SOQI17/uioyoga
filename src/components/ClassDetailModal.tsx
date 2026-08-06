import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Clock, Users, User, ShieldCheck, 
  Trash2, Edit3, Copy, CheckCircle2, AlertCircle, ExternalLink, Download, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Button } from './ui/Button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface YogaClass {
  id: string;
  title: string;
  instructor: string;
  level: string;
  capacity: number;
  date: string; // ISO string
  duration: number; // minutes
  featured?: boolean;
  image?: string;
}

interface ClassDetailModalProps {
  classItem: YogaClass | null;
  isOpen: boolean;
  onClose: () => void;
  bookings: any[];
  isUserBooked: boolean;
  userData: any;
  bookingLoading: boolean;
  onBook: (c: YogaClass) => void;
  onCancelBook: (classId: string) => void;
  onEditClass: (c: YogaClass) => void;
  onDuplicateClass: (c: YogaClass) => void;
  onDeleteClass: (classId: string) => void;
  getGoogleCalendarUrl: (c: YogaClass) => string;
  handleDownloadIcs: (c: YogaClass) => void;
}

export function ClassDetailModal({
  classItem,
  isOpen,
  onClose,
  bookings,
  isUserBooked,
  userData,
  bookingLoading,
  onBook,
  onCancelBook,
  onEditClass,
  onDuplicateClass,
  onDeleteClass,
  getGoogleCalendarUrl,
  handleDownloadIcs,
}: ClassDetailModalProps) {
  const [showAttendees, setShowAttendees] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (!isOpen || !classItem) return null;

  const isAdminOrInstructor = userData?.role === 'admin' || userData?.role === 'instructor' || userData?.role === 'superadmin';
  const spotsTaken = bookings.length;
  const spotsAvailable = classItem.capacity - spotsTaken;
  const isFull = spotsAvailable <= 0;
  const isInactive = userData && !isAdminOrInstructor && !userData.subscriptionActive;

  const classDate = new Date(classItem.date);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-[28px] sm:rounded-[32px] border-4 sm:border-[6px] border-[#4a2e1b] bg-arena shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Full-modal Background Image */}
          <img
            src={classItem.image || `https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop`}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Dark overlay over the full modal so content is readable */}
          <div className="absolute inset-0 bg-[#121214]/82" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform hover:scale-110 hover:bg-black/80 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Scrollable Content (all on top of the image) */}
          <div className="relative z-10 flex flex-col flex-1 overflow-y-auto max-h-[92vh]">
            {/* Title block at top */}
            <div className="px-6 pt-14 pb-5">
              <span className="inline-block rounded-full bg-salvia/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black shadow-md mb-3">
                {classItem.level}
              </span>
              <h2 className="font-serif text-3xl font-medium text-white drop-shadow-md leading-tight">
                {classItem.title}
              </h2>
              {classItem.instructor && (
                <p className="text-xs text-white/70 italic flex items-center gap-1.5 mt-2">
                  <User className="w-3.5 h-3.5 text-salvia" />
                  Guiado por <span className="font-semibold text-white">{classItem.instructor}</span>
                </p>
              )}
            </div>

            {/* Body Content */}
            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 text-gris">
              {/* Class Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center text-center">
                  <Calendar className="w-4 h-4 text-terracota mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Fecha</span>
                  <span className="text-xs font-semibold capitalize mt-0.5 text-white">
                    {format(classDate, "EEE d MMM", { locale: es })}
                  </span>
                </div>

                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center text-center">
                  <Clock className="w-4 h-4 text-salvia mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Hora</span>
                  <span className="text-xs font-semibold mt-0.5 text-white">
                    {format(classDate, "HH:mm")} ({classItem.duration}m)
                  </span>
                </div>

                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center text-center">
                  <Users className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Cupos</span>
                  <span className={`text-xs font-semibold mt-0.5 ${isFull ? 'text-red-400 font-bold' : 'text-salvia'}`}>
                    {isFull ? 'Agotado' : `${spotsAvailable}/${classItem.capacity}`}
                  </span>
                </div>
              </div>

              {/* Student Booking Status Notification */}
              {isUserBooked && (
                <div className="rounded-2xl bg-salvia/15 p-4 border border-salvia/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-salvia shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-salvia">¡Ya estás inscripto(a) en esta clase!</h4>
                    <p className="text-xs text-white/70 mt-0.5">
                      Tu cupo está asegurado. Puedes cancelar tu reserva en cualquier momento o sincronizarla con tu calendario.
                    </p>
                  </div>
                </div>
              )}

              {isInactive && !isUserBooked && (
                <div className="rounded-2xl bg-red-500/15 p-4 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Suscripción requerida</h4>
                    <p className="text-xs text-white/70 mt-0.5">
                      No tienes una suscripción activa o tus saldo de clases se ha agotado. Contacta al administrador para habilitar tu plan.
                    </p>
                  </div>
                </div>
              )}

              {/* Admin / Instructor Section: View Attendees */}
              {isAdminOrInstructor && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAttendees(!showAttendees)}
                    className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-salvia hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-salvia" />
                      Lista de Inscriptos ({bookings.length} Alumnos)
                    </span>
                    {showAttendees ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAttendees && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2 border-t border-white/10 space-y-2 max-h-40 overflow-y-auto pr-1"
                    >
                      {bookings.length > 0 ? (
                        bookings.map((b, index) => (
                          <div key={b.id || index} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/5 border border-white/5">
                            <div>
                              <span className="font-semibold text-white block">{b.userName || 'Alumno'}</span>
                              <span className="text-[10px] text-white/50">{b.userEmail}</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-wider text-salvia bg-salvia/10 px-2 py-0.5 rounded-full">
                              Confirmado
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-white/50 italic py-2 text-center">
                          Aún no hay alumnos inscriptos en esta clase.
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Actions Section */}
              <div className="space-y-3 pt-2">
                {isAdminOrInstructor ? (
                  /* Admin & Instructor Buttons */
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => {
                          onClose();
                          onEditClass(classItem);
                        }}
                        className="rounded-full bg-salvia py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-salvia/90 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => {
                          onClose();
                          onDuplicateClass(classItem);
                        }}
                        className="rounded-full bg-white/10 border border-white/20 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicar
                      </Button>
                    </div>
                    <Button
                      onClick={() => {
                        if (window.confirm("¿Estás seguro de eliminar esta clase?")) {
                          onClose();
                          onDeleteClass(classItem.id);
                        }
                      }}
                      className="w-full rounded-full bg-red-500/10 border border-red-500/30 py-3 text-xs font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar Clase
                    </Button>
                  </div>
                ) : (
                  /* Student Buttons */
                  <div className="space-y-3">
                    <Button
                      disabled={bookingLoading || (isFull && !isUserBooked) || (isInactive && !isUserBooked)}
                      onClick={() => {
                        if (isUserBooked) {
                          onCancelBook(classItem.id);
                        } else {
                          onBook(classItem);
                        }
                      }}
                      className={`w-full rounded-full py-4 text-xs font-bold uppercase tracking-widest text-white transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                        isUserBooked
                          ? 'bg-terracota hover:bg-red-600'
                          : isInactive
                            ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                            : isFull
                              ? 'bg-white/10 text-white/40 cursor-not-allowed'
                              : 'bg-salvia text-black hover:bg-salvia/90 font-black'
                      }`}
                    >
                      {bookingLoading ? (
                        'Procesando...'
                      ) : isUserBooked ? (
                        'Cancelar Reserva'
                      ) : isInactive ? (
                        'Suscripción Inactiva'
                      ) : isFull ? (
                        'Sin Cupos Disponibles'
                      ) : (
                        'Reservar Espacio'
                      )}
                    </Button>

                    {/* Add to Calendar Options */}
                    {isUserBooked && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCalendarOpen(!calendarOpen)}
                          className="w-full rounded-full bg-white/10 border border-white/20 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Calendar className="w-4 h-4 text-salvia" />
                          Añadir a mi Calendario
                          {calendarOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {calendarOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 rounded-2xl bg-[#18181b] border border-white/15 p-2 space-y-1 shadow-xl"
                          >
                            <a
                              href={getGoogleCalendarUrl(classItem)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setCalendarOpen(false)}
                              className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold text-white/90 hover:bg-salvia/20 hover:text-salvia rounded-xl transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <ExternalLink className="w-3.5 h-3.5 text-salvia" />
                                Google Calendar
                              </span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                handleDownloadIcs(classItem);
                                setCalendarOpen(false);
                              }}
                              className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold text-white/90 hover:bg-salvia/20 hover:text-salvia rounded-xl transition-colors cursor-pointer text-left"
                            >
                              <span className="flex items-center gap-2">
                                <Download className="w-3.5 h-3.5 text-salvia" />
                                Apple / Outlook / Mobile (.ics)
                              </span>
                            </button>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
