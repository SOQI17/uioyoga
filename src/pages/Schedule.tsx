import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc, getDoc, updateDoc, where } from 'firebase/firestore';
import { db, getTenantId } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { AdminClassForm } from '../components/AdminClassForm';
import { WeeklyScheduleGrid } from '../components/WeeklyScheduleGrid';
import { ClassDetailModal, YogaClass } from '../components/ClassDetailModal';

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

  // Time filter state
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon'>('all');

  // Detail Modal Popup state
  const [selectedClassForModal, setSelectedClassForModal] = useState<YogaClass | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isAdminOrInstructor = userData?.role === 'admin' || userData?.role === 'instructor' || userData?.role === 'superadmin';

  const getGoogleCalendarUrl = (c: YogaClass) => {
    const startDate = new Date(c.date);
    const endDate = new Date(startDate.getTime() + c.duration * 60 * 1000);
    
    const toGCalString = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Yoga: ${c.title}`)}&dates=${toGCalString(startDate)}/${toGCalString(endDate)}&details=${encodeURIComponent(`Clase de Yoga${c.instructor ? ` guiada por ${c.instructor}` : ''}.\nNivel: ${c.level}\nDuración: ${c.duration} minutos.`)}&sf=true&output=xml`;
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
      "PRODID:-//UIO Yoga//Schedule//ES",
      "BEGIN:VEVENT",
      `UID:${c.id}@uioyoga.com`,
      `DTSTAMP:${toIcsString(new Date())}`,
      `DTSTART:${toIcsString(startDate)}`,
      `DTEND:${toIcsString(endDate)}`,
      `SUMMARY:Yoga: ${c.title}`,
      `DESCRIPTION:Clase de Yoga${c.instructor ? ` guiada por ${c.instructor}` : ''}. Nivel: ${c.level}.`,
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
      const q = query(collection(db, 'classes'), where('tenantId', '==', getTenantId()), orderBy('date'));
      const snapshot = await getDocs(q);
      const fetchedClasses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YogaClass));
      
      // 2. Fetch bookings
      const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('tenantId', '==', getTenantId())));
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
        tenantId: getTenantId(),
        bookedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bookings'), bookingData);

      // 3. Decrement credit count if not unlimited and not admin
      if (!isAdmin && !uData.unlimitedClasses) {
        const newCredits = Math.max(0, (uData.classesRemaining || 0) - 1);
        await updateDoc(userRef, { classesRemaining: newCredits });
      }

      alert("¡Reserva confirmada con éxito!");
      setIsDetailModalOpen(false);
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
        setIsDetailModalOpen(false);
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
    try {
      await deleteDoc(doc(db, 'classes', id));
      setIsDetailModalOpen(false);
      fetchClasses();
    } catch (err) {
      console.error("Error deleting class:", err);
      alert("No se pudo eliminar la clase.");
    }
  };

  // Open Popup Modal for a selected class
  const handleOpenClassModal = (c: YogaClass) => {
    setSelectedClassForModal(c);
    setIsDetailModalOpen(true);
  };

  // Open Admin Class Form for creating a class at specific date & time slot
  const handleCreateClassAtSlot = (dateTimeIso: string) => {
    setClassToEdit({ date: dateTimeIso } as any);
    setIsFormOpen(true);
  };

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

      {/* POPUP VENTANA INTERACTIVA DE CLASE */}
      <ClassDetailModal
        classItem={selectedClassForModal}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedClassForModal(null);
        }}
        bookings={selectedClassForModal ? (bookings[selectedClassForModal.id] || []) : []}
        isUserBooked={selectedClassForModal ? userBookedIds.has(selectedClassForModal.id) : false}
        userData={userData}
        bookingLoading={bookingLoading === selectedClassForModal?.id}
        onBook={handleBook}
        onCancelBook={handleCancelBook}
        onEditClass={(c) => {
          setClassToEdit(c);
          setIsFormOpen(true);
        }}
        onDuplicateClass={(c) => {
          const { id, ...classWithoutId } = c;
          setClassToEdit(classWithoutId as any);
          setIsFormOpen(true);
        }}
        onDeleteClass={handleDeleteClass}
        getGoogleCalendarUrl={getGoogleCalendarUrl}
        handleDownloadIcs={handleDownloadIcs}
      />

      <div className="container mx-auto px-4 md:px-12">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="mb-4 block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota">Tu Práctica</span>
            <h1 className="mb-4 font-serif text-5xl font-medium leading-[1.1] text-gris md:text-6xl">Horarios & Reservas</h1>
            <p className="max-w-2xl text-lg text-gris/80 leading-relaxed">
              Encuentra tu momento de paz. Reserva tu espacio en nuestras clases presenciales y virtuales, diseñadas para cada nivel.
            </p>
          </div>
          {isAdminOrInstructor && (
            <Button
              onClick={() => {
                setClassToEdit(null);
                setIsFormOpen(true);
              }}
              className="rounded-full bg-salvia px-8 py-3 text-xs font-bold uppercase tracking-widest text-black hover:bg-salvia/90 shadow-md h-fit cursor-pointer"
            >
              + Crear Clase
            </Button>
          )}
        </div>

        {/* FILTERS BAR */}
        <div className="mb-8 flex items-center justify-between bg-marfil/40 p-6 rounded-3xl border border-arena/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mr-2">Filtrar Horario:</span>
            <div className="inline-flex rounded-full bg-white/50 p-1 border border-arena/20 shadow-sm">
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  timeFilter === 'all' 
                    ? 'bg-salvia text-black shadow-sm' 
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
                    ? 'bg-salvia text-black shadow-sm' 
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
                    ? 'bg-salvia text-black shadow-sm' 
                    : 'text-gris hover:bg-white/30'
                }`}
              >
                Tarde
              </button>
            </div>
          </div>
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
          /* WEEKLY CALENDAR INTERACTIVE GRID VIEW */
          <WeeklyScheduleGrid
            classes={classes}
            bookings={bookings}
            userBookedIds={userBookedIds}
            userData={userData}
            onSelectClass={handleOpenClassModal}
            onCreateClassAt={handleCreateClassAtSlot}
            timeFilter={timeFilter}
          />
        )}
      </div>
    </div>
  );
}
