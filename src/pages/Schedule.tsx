import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc } from 'firebase/firestore';
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

    const classBookings = bookings[c.id] || [];
    const isAlreadyBooked = userBookedIds.has(c.id);

    if (isAlreadyBooked) {
      await handleCancelBook(c.id);
      return;
    }

    if (classBookings.length >= c.capacity) {
      alert("Lo sentimos, esta clase ya está llena.");
      return;
    }

    setBookingLoading(c.id);
    try {
      const bookingData = {
        classId: c.id,
        className: c.title,
        classDate: c.date,
        userId: user.uid,
        userName: userData?.name || user.displayName || 'Alumno',
        userEmail: user.email || '',
        bookedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bookings'), bookingData);
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

    setBookingLoading(classId);
    try {
      const classBookings = bookings[classId] || [];
      const userBooking = classBookings.find(b => b.userId === user.uid);
      if (userBooking) {
        await deleteDoc(doc(db, 'bookings', userBooking.id));
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
            {classes.length > 0 ? classes.map((c, i) => {
              const spotsTaken = bookings[c.id]?.length || 0;
              const spotsAvailable = c.capacity - spotsTaken;
              const isAlreadyBooked = userBookedIds.has(c.id);
              const isFull = spotsAvailable <= 0;

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
                          <Button 
                            disabled={bookingLoading === c.id || (isFull && !isAlreadyBooked)}
                            onClick={() => handleBook(c)} 
                            className={`w-full rounded-full py-6 text-xs font-bold uppercase tracking-widest text-white transition-colors ${
                              isAlreadyBooked 
                                ? 'bg-terracota hover:bg-red-600 shadow-md' 
                                : isFull 
                                  ? 'bg-gris/40 cursor-not-allowed' 
                                  : 'bg-gris hover:bg-salvia'
                            }`}
                          >
                            {bookingLoading === c.id 
                              ? 'Procesando...' 
                              : isAlreadyBooked 
                                ? 'Cancelar Reserva' 
                                : isFull 
                                  ? 'Sin Cupos' 
                                  : 'Reservar Espacio'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }) : (
              <div className="col-span-full py-20 text-center text-gris/60">
                <p className="text-xl">No hay clases programadas por el momento.</p>
                <p className="mt-2">Vuelve pronto para ver nuestro nuevo calendario.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
