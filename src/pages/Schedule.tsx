import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { AdminClassForm } from '../components/AdminClassForm';

interface YogaClass {
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

export function Schedule() {
  const [classes, setClasses] = useState<YogaClass[]>([]);
  const [bookings, setBookings] = useState<Record<string, any[]>>({});
  const [userBookedIds, setUserBookedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { user, userData } = useAuthStore();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<YogaClass | null>(null);

  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const DAYS_OF_WEEK = [
    { name: 'Lunes', value: 1 },
    { name: 'Martes', value: 2 },
    { name: 'Miércoles', value: 3 },
    { name: 'Jueves', value: 4 },
    { name: 'Viernes', value: 5 },
    { name: 'Sábado', value: 6 },
    { name: 'Domingo', value: 0 }
  ];

  const getGoogleCalendarUrl = (c: YogaClass) => {
    const startDate = new Date(c.date);
    const endDate = new Date(startDate.getTime() + c.duration * 60 * 1000);
    
    const toGCalString = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Yoga: ${c.title}`)}&dates=${toGCalString(startDate)}/${toGCalString(endDate)}&details=${encodeURIComponent(`Clase de Yoga guiada por ${c.instructor}.\nNivel: ${c.level}\nDuración: ${c.duration} minutos.`)}&sf=true&output=xml`;
  };

  const handleDownloadIcs = (c: YogaClass) => {
    const startDate = new Date(c.date);
    const endDate = new Date(startDate.getTime() + c.duration * 60 * 1000);
    
    const toIcsString = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kukut Yoga//Schedule//ES",
      "BEGIN:VEVENT",
      `UID:${c.id}@kukutyoga.com`,
      `DTSTAMP:${toIcsString(new Date())}`,
      `DTSTART:${toIcsString(startDate)}`,
      `DTEND:${toIcsString(endDate)}`,
      `SUMMARY:Yoga: ${c.title}`,
      `DESCRIPTION:Clase de Yoga guiada por ${c.instructor}. Nivel: ${c.level}.`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${c.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchClasses = async () => {
    try {
      setErrorMsg(null);
      
      // 1. Fetch classes
      const q = query(collection(db, 'classes'), orderBy('date'));
      const snapshot = await getDocs(q);
      const fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YogaClass));
      
      // 2. Fetch bookings
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const bookingsMap: Record<string, any[]> = {};
      const userBooked = new Set<string>();

      bookingsSnap.docs.forEach((d) => {
        const data = d.data();
        if (!bookingsMap[data.classId]) {
          bookingsMap[data.classId] = [];
        }
        bookingsMap[data.classId].push({ id: d.id, ...data });

        if (user && data.userId === user.uid) {
          userBooked.add(data.classId);
        }
      });

      setBookings(bookingsMap);
      setUserBookedIds(userBooked);
      setClasses(fetchedClasses);
    } catch (error: any) {
      console.error("Error fetching classes", error);
      if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
        setErrorMsg("No tienes permiso para ver las clases. Por favor, asegúrate de estar logueado o verifica las reglas de seguridad de Firestore.");
      } else {
        setErrorMsg("Ocurrió un error al cargar las clases.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const handleBook = async (c: YogaClass) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const isAdmin = userData?.role === 'admin';

    setBookingLoading(c.id);
    try {
      // 1. Fetch fresh user data to verify subscription
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        alert("No se pudo verificar tu perfil de usuario.");
        return;
      }
      
      const uData = userSnap.data();

      // Check subscription for non-admins
      if (!isAdmin) {
        if (!uData.subscriptionActive) {
          alert("Tu suscripción no está activa. Por favor contacta al administrador para registrar tu pago.");
          return;
        }

        // Check expiration
        if (uData.subscriptionExpiry && new Date(uData.subscriptionExpiry) < new Date()) {
          alert("Tu suscripción ha expirado. Por favor contacta al administrador para renovarla.");
          await updateDoc(userRef, { subscriptionActive: false });
          return;
        }

        // Check credit balance
        if (!uData.unlimitedClasses && (!uData.classesRemaining || uData.classesRemaining <= 0)) {
          alert("No te quedan clases disponibles en tu saldo mensual. Por favor contacta al administrador.");
          return;
        }
      }

      // Check if already booked
      const classBookings = bookings[c.id] || [];
      const isAlreadyBooked = userBookedIds.has(c.id);

      if (isAlreadyBooked) {
        await handleCancelBook(c.id);
        return;
      }

      // Check capacity
      if (classBookings.length >= c.capacity) {
        alert("Lo sentimos, esta clase ya está llena.");
        return;
      }

      // 2. Save booking
      const bookingData = {
        classId: c.id,
        className: c.title,
        classDate: c.date,
        userId: user.uid,
        userName: uData.name || user.displayName || 'Alumno',
        userEmail: user.email || '',
        bookedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bookings'), bookingData);

      // 3. Decrement credit count if not unlimited and not admin
      if (!isAdmin && !uData.unlimitedClasses) {
        const newCredits = Math.max(0, (uData.classesRemaining || 0) - 1);
        await updateDoc(userRef, { classesRemaining: newCredits });
      }

      alert("¡Reserva confirmada con éxito!");
      await fetchClasses();
    } catch (err: any) {
      console.error("Error creating booking:", err);
      alert("No se pudo completar la reserva.");
    } finally {
      setBookingLoading(null);
    }
  };

  const handleCancelBook = async (classId: string) => {
    if (!user) return;
    if (!window.confirm("¿Deseas cancelar tu reserva para esta clase?")) return;

    const isAdmin = userData?.role === 'admin';

    setBookingLoading(classId);
    try {
      const classBookings = bookings[classId] || [];
      const userBooking = classBookings.find(b => b.userId === user.uid);
      if (userBooking) {
        // 1. Delete booking doc
        await deleteDoc(doc(db, 'bookings', userBooking.id));

        // 2. Refund credit if not unlimited and not admin
        if (!isAdmin) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (!uData.unlimitedClasses) {
              const newCredits = (uData.classesRemaining || 0) + 1;
              await updateDoc(userRef, { classesRemaining: newCredits });
            }
          }
        }

        alert("Reserva cancelada correctamente.");
        await fetchClasses();
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("No se pudo cancelar la reserva.");
    } finally {
      setBookingLoading(null);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta clase?")) return;
    try {
      await deleteDoc(doc(db, 'classes', id));
      fetchClasses();
    } catch (err) {
      console.error("Error deleting class:", err);
      alert("No se pudo eliminar la clase.");
    }
  };

  const filteredClasses = classes.filter((c) => {
    const classDate = new Date(c.date);
    
    // 1. Filter by Mañana / Tarde
    const hour = classDate.getHours();
    if (timeFilter === 'morning' && hour >= 12) return false;
    if (timeFilter === 'afternoon' && hour < 12) return false;
    
    // 2. Filter by Day of Week
    if (viewMode === 'week' && selectedDayOfWeek !== null) {
      const day = classDate.getDay();
      if (day !== selectedDayOfWeek) return false;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-marfil py-16 relative">
      {/* MODAL PARA CREAR/EDITAR CLASES */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <AdminClassForm
            classToEdit={classToEdit}
            onSuccess={() => {
              setIsFormOpen(false);
              setClassToEdit(null);
              fetchClasses();
            }}
            onCancel={() => {
              setIsFormOpen(false);
              setClassToEdit(null);
            }}
          />
        </div>
      )}

      <div className="container mx-auto px-4 md:px-12">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="mb-4 block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota">Tu Práctica</span>
            <h1 className="mb-4 font-serif text-5xl font-medium leading-[1.1] text-gris md:text-6xl">Horarios & Reservas</h1>
            <p className="max-w-2xl text-lg text-gris/80 leading-relaxed">
              Encuentra tu momento de paz. Reserva tu espacio en nuestras clases presenciales y virtuales, diseñadas para cada nivel.
            </p>
          </div>
          {userData?.role === 'admin' && (
            <Button
              onClick={() => {
                setClassToEdit(null);
                setIsFormOpen(true);
              }}
              className="rounded-full bg-salvia px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md h-fit"
            >
              Crear Clase
            </Button>
          )}
        </div>

        {/* FILTERS & VIEWS BAR */}
        <div className="mb-8 flex flex-col gap-6 bg-marfil/40 p-6 rounded-3xl border border-arena/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Vista Mode Selector (List vs Week) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mr-2">Vista:</span>
              <div className="inline-flex rounded-full bg-white/50 p-1 border border-arena/20 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setSelectedDayOfWeek(null);
                  }}
                  className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'list' 
                      ? 'bg-salvia text-white shadow-sm' 
                      : 'text-gris hover:bg-white/30'
                  }`}
                >
                  Lista Completa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('week');
                    const todayDay = new Date().getDay();
                    setSelectedDayOfWeek(todayDay);
                  }}
                  className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    viewMode === 'week' 
                      ? 'bg-salvia text-white shadow-sm' 
                      : 'text-gris hover:bg-white/30'
                  }`}
                >
                  Por Semana
                </button>
              </div>
            </div>

            {/* Time Filter Selector (Mañana vs Tarde) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mr-2">Horario:</span>
              <div className="inline-flex rounded-full bg-white/50 p-1 border border-arena/20 shadow-sm">
                <button
                  type="button"
                  onClick={() => setTimeFilter('all')}
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    timeFilter === 'all' 
                      ? 'bg-salvia text-white shadow-sm' 
                      : 'text-gris hover:bg-white/30'
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('morning')}
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    timeFilter === 'morning' 
                      ? 'bg-salvia text-white shadow-sm' 
                      : 'text-gris hover:bg-white/30'
                  }`}
                >
                  Mañana
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('afternoon')}
                  className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    timeFilter === 'afternoon' 
                      ? 'bg-salvia text-white shadow-sm' 
                      : 'text-gris hover:bg-white/30'
                  }`}
                >
                  Tarde
                </button>
              </div>
            </div>

          </div>

          {/* Week Selector (rendered only when viewMode === 'week') */}
          {viewMode === 'week' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t border-arena/20 pt-4 flex flex-col gap-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-1">Día de la semana:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDayOfWeek(null)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                    selectedDayOfWeek === null
                      ? 'bg-salvia text-white border-salvia shadow-sm'
                      : 'bg-white/50 border-arena/20 text-gris hover:bg-white/80'
                  }`}
                >
                  Todos los días
                </button>
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.name}
                    type="button"
                    onClick={() => setSelectedDayOfWeek(day.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all border cursor-pointer ${
                      selectedDayOfWeek === day.value
                        ? 'bg-salvia text-white border-salvia shadow-sm'
                        : 'bg-white/50 border-arena/20 text-gris hover:bg-white/80'
                    }`}
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-salvia"></div>
          </div>
        ) : errorMsg ? (
          <div className="py-20 text-center text-red-500 bg-red-50 rounded-[32px] border-[8px] border-white p-8 shadow-xl">
            <p className="text-xl font-medium">{errorMsg}</p>
            <p className="mt-4 text-sm opacity-80 text-gris">
              Si eres el administrador, ve a la consola de Firebase &gt; Firestore Database &gt; Rules y actualiza tus reglas para permitir lectura.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.length > 0 ? filteredClasses.map((c, i) => {
              const spotsTaken = bookings[c.id]?.length || 0;
              const spotsAvailable = c.capacity - spotsTaken;
              const isAlreadyBooked = userBookedIds.has(c.id);
              const isFull = spotsAvailable <= 0;
              const isInactive = userData && userData.role !== 'admin' && !userData.subscriptionActive;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="overflow-hidden rounded-[32px] border-[8px] border-white bg-arena shadow-xl transition-transform hover:-translate-y-1 hover:shadow-2xl">
                    <div className="h-56 p-6 flex flex-col justify-end relative overflow-hidden rounded-t-[24px]">
                       <div className="absolute inset-0">
                           <img src={c.image || `https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=500&auto=format&fit=crop&sig=${c.id}`} alt="Yoga Class" className="w-full h-full object-cover mix-blend-overlay opacity-60" />
                       </div>
                       <div className="relative z-10 bg-white/90 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest text-terracota w-fit mb-2 shadow-sm">
                          {c.level}
                       </div>
                    </div>
                    <CardHeader className="pt-8 pb-2">
                      <CardTitle className="font-serif text-2xl text-gris">{c.title}</CardTitle>
                      <p className="text-sm text-gris/60 italic">Guiado por {c.instructor}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-8 space-y-3 text-sm text-gris/80 mt-4">
                        <div className="flex justify-between items-center border-b border-white/50 pb-2">
                          <span className="text-xs uppercase tracking-widest opacity-60 font-medium">Fecha</span>
                          <span className="font-medium capitalize">{format(new Date(c.date || new Date()), "EEEE d MMM", { locale: es })}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/50 pb-2">
                          <span className="text-xs uppercase tracking-widest opacity-60 font-medium">Hora</span>
                          <span className="font-medium">{format(new Date(c.date || new Date()), "HH:mm")} ({c.duration} min)</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                          <span className="text-xs uppercase tracking-widest opacity-60 font-medium">Cupos</span>
                          <span className={`font-medium ${isFull ? 'text-red-500 font-bold' : 'text-salvia'}`}>
                            {isFull ? 'Agotado' : `${spotsAvailable} de ${c.capacity} disponibles`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-4">
                        {userData?.role === 'admin' ? (
                          <>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => {
                                  setClassToEdit(c);
                                  setIsFormOpen(true);
                                }} 
                                className="flex-1 rounded-full bg-salvia py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 transition-colors"
                              >
                                Editar
                              </Button>
                              <Button 
                                onClick={() => {
                                  const duplicate = { ...c, id: undefined } as any;
                                  setClassToEdit(duplicate);
                                  setIsFormOpen(true);
                                }} 
                                className="flex-1 rounded-full bg-arena py-3 text-xs font-bold uppercase tracking-widest text-gris hover:bg-arena transition-colors border border-arena"
                              >
                                Duplicar
                              </Button>
                            </div>
                            <Button 
                              onClick={() => handleDeleteClass(c.id)} 
                              className="w-full rounded-full bg-red-50 border border-red-200 py-3 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Eliminar
                            </Button>
                          </>
                        ) : (
                          <div className="flex flex-col gap-2 w-full">
                            <Button 
                              disabled={bookingLoading === c.id || (isFull && !isAlreadyBooked) || (isInactive && !isAlreadyBooked)}
                              onClick={() => handleBook(c)} 
                              className={`w-full rounded-full py-6 text-xs font-bold uppercase tracking-widest text-white transition-colors ${
                                isAlreadyBooked 
                                  ? 'bg-terracota hover:bg-red-600 shadow-md' 
                                  : isInactive
                                    ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed hover:bg-red-50'
                                    : isFull 
                                      ? 'bg-gris/40 cursor-not-allowed' 
                                      : 'bg-gris hover:bg-salvia'
                              }`}
                            >
                              {bookingLoading === c.id 
                                ? 'Procesando...' 
                                : isAlreadyBooked 
                                  ? 'Cancelar Reserva' 
                                  : isInactive
                                    ? 'Suscripción Inactiva'
                                    : isFull 
                                      ? 'Sin Cupos' 
                                      : 'Reservar Espacio'}
                            </Button>

                            {/* "Añadir al Calendario" Dropdown Button for Booked Classes */}
                            {isAlreadyBooked && (
                              <div className="relative w-full">
                                <Button
                                  type="button"
                                  onClick={() => setActiveDropdownId(activeDropdownId === c.id ? null : c.id)}
                                  className="w-full rounded-full bg-white/80 border border-arena py-3 text-xs font-bold uppercase tracking-widest text-gris hover:bg-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                                >
                                  📅 Añadir al Calendario
                                </Button>

                                {activeDropdownId === c.id && (
                                  <div className="absolute right-0 left-0 bottom-full mb-2 z-20 rounded-2xl bg-white shadow-xl border border-arena/20 p-2 space-y-1">
                                    <a
                                      href={getGoogleCalendarUrl(c)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={() => setActiveDropdownId(null)}
                                      className="block w-full text-center px-4 py-2.5 text-xs font-semibold text-gris hover:bg-salvia/10 hover:text-salvia rounded-xl transition-colors cursor-pointer"
                                    >
                                      Google Calendar
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDownloadIcs(c);
                                        setActiveDropdownId(null);
                                      }}
                                      className="block w-full text-center px-4 py-2.5 text-xs font-semibold text-gris hover:bg-salvia/10 hover:text-salvia rounded-xl transition-colors cursor-pointer"
                                    >
                                      Apple / Outlook / Android (.ics)
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }) : (
              <div className="col-span-full py-20 text-center text-gris/60">
                <p className="text-xl">No hay clases programadas para los filtros seleccionados.</p>
                <p className="mt-2 text-sm opacity-80">Prueba cambiando de día o quitando el filtro de mañana/tarde.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
