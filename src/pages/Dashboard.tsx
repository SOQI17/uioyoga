import { useAuthStore, UserData } from '../store/authStore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, setDoc, where } from 'firebase/firestore';
import { AdminClassForm } from '../components/AdminClassForm';
import { AdminRetreatForm } from '../components/AdminRetreatForm';
import { AdminHomeSettings } from '../components/AdminHomeSettings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

interface Retreat {
  id: string;
  title: string;
  location: string;
  date: string;
  price: string;
  image: string;
  description: string;
}

export function Dashboard() {
  const { user, userData, loading } = useAuthStore();
  const navigate = useNavigate();
  
  // State for Classes
  const [classes, setClasses] = useState<YogaClass[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<YogaClass | null>(null);

  // State for Bookings & Weekly view
  const [bookings, setBookings] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<'list' | 'weekly'>('weekly');
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  
  // Student List inspection modal
  const [isStudentListOpen, setIsStudentListOpen] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<YogaClass | null>(null);

  // Student specific bookings
  const [studentBookings, setStudentBookings] = useState<any[]>([]);
  const [studentBookingsLoading, setStudentBookingsLoading] = useState(false);

  // State for Retreats
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [retreatsLoading, setRetreatsLoading] = useState(false);
  const [isRetreatFormOpen, setIsRetreatFormOpen] = useState(false);
  const [retreatToEdit, setRetreatToEdit] = useState<Retreat | null>(null);

  // State for Collaborators
  const [users, setUsers] = useState<UserData[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'classes' | 'retreats' | 'home' | 'users'>('classes');

  const fetchClasses = async () => {
    if (!userData || userData.role !== 'admin') return;
    setAdminLoading(true);
    try {
      // 1. Fetch classes
      const q = query(collection(db, 'classes'), orderBy('date'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YogaClass));
      setClasses(fetched);

      // 2. Fetch bookings
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const bookingsMap: Record<string, any[]> = {};
      bookingsSnap.docs.forEach((d) => {
        const data = d.data();
        if (!bookingsMap[data.classId]) {
          bookingsMap[data.classId] = [];
        }
        bookingsMap[data.classId].push({ id: d.id, ...data });
      });
      setBookings(bookingsMap);
    } catch (err) {
      console.error("Error fetching classes for admin:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchStudentBookings = async () => {
    if (!user || userData?.role === 'admin') return;
    setStudentBookingsLoading(true);
    try {
      const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentBookings(fetched);
    } catch (err) {
      console.error("Error fetching student bookings:", err);
    } finally {
      setStudentBookingsLoading(false);
    }
  };

  const handleCancelStudentBooking = async (bookingId: string) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta reserva?")) return;
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      alert("Reserva cancelada correctamente.");
      fetchStudentBookings();
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("No se pudo cancelar la reserva.");
    }
  };

  const handleRemoveStudentFromClass = async (bookingId: string) => {
    if (!window.confirm("¿Seguro que deseas remover a este alumno de la clase?")) return;
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      alert("Alumno removido con éxito.");
      fetchClasses(); // Refresh counts
    } catch (err) {
      console.error("Error removing student booking:", err);
      alert("No se pudo remover al alumno.");
    }
  };

  const fetchRetreats = async () => {
    if (!userData || userData.role !== 'admin') return;
    setRetreatsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'retreats'));
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Retreat));
      setRetreats(fetched);
    } catch (err) {
      console.error("Error fetching retreats for admin:", err);
    } finally {
      setRetreatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!userData || userData.role !== 'admin') return;
    setUsersLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const fetched = snapshot.docs.map(doc => doc.data() as UserData);
      setUsers(fetched);
    } catch (err) {
      console.error("Error fetching users for admin:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'student' | 'instructor' | 'admin') => {
    if (userId === userData.uid) {
      alert("No puedes cambiar tu propio rol.");
      return;
    }
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
      fetchUsers();
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("No se pudo actualizar el rol del usuario.");
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (userData?.role === 'admin') {
      fetchClasses();
      fetchUsers();
      fetchRetreats();
    } else if (user) {
      fetchStudentBookings();
    }
  }, [userData, user]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
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

  const handleDeleteRetreat = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este retiro?")) return;
    try {
      await deleteDoc(doc(db, 'retreats', id));
      fetchRetreats();
    } catch (err) {
      console.error("Error deleting retreat:", err);
      alert("No se pudo eliminar el retiro.");
    }
  };

  // Helper function to calculate the 7 days of the selected week (starts on Monday)
  const getDaysOfWeek = (currentDate: Date) => {
    const temp = new Date(currentDate);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (0)
    const monday = new Date(temp.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const isSameDate = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const daysOfWeek = getDaysOfWeek(currentWeekDate);

  const handlePrevWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() - 7);
    setCurrentWeekDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekDate);
    d.setDate(d.getDate() + 7);
    setCurrentWeekDate(d);
  };

  const handleToday = () => {
    setCurrentWeekDate(new Date());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-marfil flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-salvia"></div>
          <p className="text-sm text-gris/70 font-medium font-serif">Cargando tu santuario...</p>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="min-h-screen bg-marfil py-12 relative">
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

      {/* MODAL PARA VER ALUMNOS INSCRITOS */}
      {isStudentListOpen && selectedClassForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 relative overflow-hidden"
          >
            <h3 className="font-serif text-2xl text-gris mb-1">Alumnos Registrados</h3>
            <p className="text-xs text-gris/60 mb-6">{selectedClassForStudents.title} con {selectedClassForStudents.instructor}</p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {(bookings[selectedClassForStudents.id] || []).length > 0 ? (
                (bookings[selectedClassForStudents.id] || []).map((b) => (
                  <div key={b.id} className="flex justify-between items-center bg-white/60 p-3 rounded-2xl border border-white">
                    <div>
                      <p className="text-sm font-semibold text-gris">{b.userName}</p>
                      <p className="text-[10px] text-gris/50">{b.userEmail}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleRemoveStudentFromClass(b.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center py-6 text-sm text-gris/60">No hay alumnos registrados en esta clase.</p>
              )}
            </div>

            <div className="flex justify-end pt-6">
              <Button
                onClick={() => {
                  setIsStudentListOpen(false);
                  setSelectedClassForStudents(null);
                }}
                className="rounded-full bg-gris px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia"
              >
                Cerrar
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL PARA CREAR/EDITAR RETIROS */}
      {isRetreatFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <AdminRetreatForm
            retreatToEdit={retreatToEdit}
            onSuccess={() => {
              setIsRetreatFormOpen(false);
              setRetreatToEdit(null);
              fetchRetreats();
            }}
            onCancel={() => {
              setIsRetreatFormOpen(false);
              setRetreatToEdit(null);
            }}
          />
        </div>
      )}

      <div className="container mx-auto px-4 md:px-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <span className="mb-2 block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota">
              {userData.role === 'admin' ? 'Consola de Control' : 'Tu Santuario'}
            </span>
            <h1 className="mb-2 font-serif text-5xl font-medium text-gris">
              {userData.role === 'admin' ? 'Administración' : 'Mi Espacio'}
            </h1>
            <p className="text-lg text-gris/70">Hola, <span className="italic font-serif">{userData.name}</span>. Bienvenido a tu panel de control.</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="rounded-full border border-arena px-6 py-2 text-xs font-bold uppercase tracking-widest text-gris hover:bg-arena">
            Cerrar Sesión
          </Button>
        </motion.div>

        {/* TABS DE ADMINISTRACIÓN (SOLO ADMIN) */}
        {userData.role === 'admin' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 border-b border-arena/30 pb-6 mb-10 text-xs font-bold uppercase tracking-widest"
          >
            <button
              onClick={() => setActiveTab('classes')}
              className={`rounded-full px-8 py-3 transition-all ${
                activeTab === 'classes' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
              }`}
            >
              Horarios & Clases
            </button>
            <button
              onClick={() => setActiveTab('retreats')}
              className={`rounded-full px-8 py-3 transition-all ${
                activeTab === 'retreats' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
              }`}
            >
              Retiros
            </button>
            <button
              onClick={() => setActiveTab('home')}
              className={`rounded-full px-8 py-3 transition-all ${
                activeTab === 'home' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
              }`}
            >
              Personalizar Inicio
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`rounded-full px-8 py-3 transition-all ${
                activeTab === 'users' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
              }`}
            >
              Colaboradores
            </button>
          </motion.div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          {/* COLUMNA PERFIL */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 space-y-8"
          >
            <Card className="rounded-[32px] border-[8px] border-white bg-arena shadow-xl">
              <CardHeader className="px-8 pt-8 pb-4 border-b border-white/50">
                <CardTitle className="font-serif text-2xl text-salvia">Mi Perfil</CardTitle>
              </CardHeader>
              <CardContent className="px-8 py-6 space-y-6 text-gris/80">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-1">Nombre</p>
                  <p className="font-medium text-lg">{userData.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-1">Email</p>
                  <p className="font-medium">{userData.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-1">Rol de Cuenta</p>
                  <p className="font-medium capitalize">{userData.role}</p>
                </div>
                <Button className="w-full mt-4 rounded-full bg-salvia py-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md">
                  Editar Perfil
                </Button>
              </CardContent>
            </Card>

            {userData.role !== 'admin' && (
              <Card className="rounded-[32px] border-[8px] border-white bg-terracota/10 shadow-xl overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-terracota/5 rounded-bl-full"></div>
                 <CardContent className="p-8 text-center relative z-10">
                     <h3 className="font-serif text-2xl font-bold text-terracota mb-8">Mi Progreso</h3>
                     <div className="flex justify-around">
                         <div className="space-y-2">
                             <p className="text-5xl font-light text-gris">{studentBookings.length}</p>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-terracota">Reservas</p>
                         </div>
                         <div className="w-px bg-terracota/20"></div>
                         <div className="space-y-2">
                             <p className="text-5xl font-light text-gris">
                               {studentBookings.length * 1}
                             </p>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-terracota">Horas</p>
                         </div>
                     </div>
                 </CardContent>
              </Card>
            )}
          </motion.div>

          {/* COLUMNA GESTIONES / CONTENIDOS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 space-y-8"
          >
            {/* TABS DE ADMINISTACIÓN CONTENIDO CONTRASTADO */}
            {userData.role === 'admin' && (
              <>
                {/* 1. GESTIÓN DE CLASES */}
                {activeTab === 'classes' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                    <CardHeader className="px-8 pt-8 pb-4 flex flex-col gap-4">
                      <div className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="font-serif text-2xl text-gris">Gestión de Clases</CardTitle>
                          <p className="text-xs text-gris/60">Monitorea y agenda tus clases de yoga</p>
                        </div>
                        <Button 
                          onClick={() => {
                            setClassToEdit(null);
                            setIsFormOpen(true);
                          }}
                          className="rounded-full bg-salvia px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md"
                        >
                          Crear Clase
                        </Button>
                      </div>

                      {/* selector de vista */}
                      <div className="flex items-center justify-between border-t border-arena/30 pt-4 mt-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setViewMode('weekly')}
                            className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                              viewMode === 'weekly' ? 'bg-gris text-white' : 'bg-arena text-gris hover:bg-arena/80'
                            }`}
                          >
                            Vista Semanal
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                              viewMode === 'list' ? 'bg-gris text-white' : 'bg-arena text-gris hover:bg-arena/80'
                            }`}
                          >
                            Vista Lista
                          </button>
                        </div>

                        {viewMode === 'weekly' && (
                          <div className="flex items-center gap-2">
                            <button onClick={handlePrevWeek} className="text-sm font-bold text-gris hover:text-salvia px-2">←</button>
                            <button onClick={handleToday} className="text-[9px] font-bold uppercase tracking-widest text-salvia hover:underline px-2">Hoy</button>
                            <button onClick={handleNextWeek} className="text-sm font-bold text-gris hover:text-salvia px-2">→</button>
                            <span className="text-[10px] font-bold text-gris/60 ml-2">
                              Semana: {format(daysOfWeek[0], 'd MMM', { locale: es })} - {format(daysOfWeek[6], 'd MMM', { locale: es })}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="px-8 pb-8">
                      {adminLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                        </div>
                      ) : classes.length > 0 ? (
                        viewMode === 'list' ? (
                          <div className="divide-y divide-gris/10 max-h-[450px] overflow-y-auto pr-2">
                            {classes.map((c) => (
                              <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-serif text-lg text-gris font-medium">{c.title}</h4>
                                    {c.featured && (
                                      <span className="bg-salvia/20 text-salvia px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider">
                                        Destacada
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gris/70">
                                    <span className="font-bold text-terracota">{c.level}</span> • Guiado por {c.instructor} • {c.duration} min
                                  </p>
                                  <p className="text-xs text-gris/60 mt-1">
                                    {format(new Date(c.date), "EEEE d MMMM, HH:mm 'hs'", { locale: es })}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setSelectedClassForStudents(c);
                                      setIsStudentListOpen(true);
                                    }}
                                    className="text-[10px] font-semibold text-salvia hover:underline mt-2 flex items-center gap-1"
                                  >
                                    👤 {bookings[c.id]?.length || 0} / {c.capacity} Reservas
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setClassToEdit(c);
                                      setIsFormOpen(true);
                                    }}
                                    className="rounded-full border border-arena px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gris hover:bg-arena"
                                  >
                                    Editar
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      const duplicate = { ...c, id: undefined } as any;
                                      setClassToEdit(duplicate);
                                      setIsFormOpen(true);
                                    }}
                                    className="rounded-full border border-arena px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gris hover:bg-arena"
                                  >
                                    Duplicar
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => handleDeleteClass(c.id)}
                                    className="rounded-full border border-red-200 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* VISTA SEMANAL */
                          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 min-w-[600px] overflow-x-auto">
                            {daysOfWeek.map((day, dIdx) => {
                              const dayClasses = classes.filter(c => isSameDate(new Date(c.date), day));
                              return (
                                <div key={dIdx} className="bg-arena/20 rounded-[24px] p-3 border border-arena/30 flex flex-col min-h-[300px]">
                                  <div className="text-center border-b border-arena/30 pb-2 mb-3 shrink-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-terracota">
                                      {format(day, 'eee', { locale: es })}
                                    </p>
                                    <p className="text-lg font-serif font-bold text-gris">
                                      {format(day, 'd')}
                                    </p>
                                  </div>
                                  
                                  <div className="space-y-3 flex-grow flex flex-col justify-start">
                                    {dayClasses.length > 0 ? (
                                      dayClasses.map((c) => (
                                        <div key={c.id} className="bg-white p-3 rounded-2xl border border-arena/10 shadow-sm space-y-1.5 text-[10px]">
                                          <div className="flex justify-between items-center">
                                            <span className="font-bold text-salvia">{format(new Date(c.date), 'HH:mm')}</span>
                                            <span className="text-[7px] font-bold uppercase tracking-wider text-terracota bg-arena px-1.5 py-0.5 rounded-full">{c.level}</span>
                                          </div>
                                          <p className="font-serif font-semibold text-gris text-xs line-clamp-1">{c.title}</p>
                                          <p className="text-[8px] text-gris/50">Con {c.instructor}</p>
                                          
                                          <button
                                            onClick={() => {
                                              setSelectedClassForStudents(c);
                                              setIsStudentListOpen(true);
                                            }}
                                            className="text-[8px] font-bold text-salvia hover:underline w-full text-left pt-1 border-t border-arena/20"
                                          >
                                            👤 {bookings[c.id]?.length || 0}/{c.capacity} Cupos
                                          </button>

                                          <div className="flex justify-between gap-1 pt-1.5 border-t border-arena/25 text-[8px]">
                                            <button onClick={() => { setClassToEdit(c); setIsFormOpen(true); }} className="text-gris/70 hover:text-salvia font-semibold uppercase">Edit</button>
                                            <button onClick={() => { const duplicate = { ...c, id: undefined } as any; setClassToEdit(duplicate); setIsFormOpen(true); }} className="text-gris/70 hover:text-salvia font-semibold uppercase">Clonar</button>
                                            <button onClick={() => handleDeleteClass(c.id)} className="text-red-500 hover:text-red-700 font-semibold uppercase">X</button>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[9px] text-gris/30 italic text-center my-auto">Libre</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <div className="text-center py-8 text-gris/60 text-sm">
                          No hay clases creadas. Presiona "Crear Clase" para añadir una.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 2. GESTIÓN DE RETIROS */}
                {activeTab === 'retreats' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                    <CardHeader className="px-8 pt-8 pb-4 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="font-serif text-2xl text-gris">Gestión de Retiros</CardTitle>
                        <p className="text-xs text-gris/60">Crea, edita o elimina salidas y retiros</p>
                      </div>
                      <Button 
                        onClick={() => {
                          setRetreatToEdit(null);
                          setIsRetreatFormOpen(true);
                        }}
                        className="rounded-full bg-salvia px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md"
                      >
                        Crear Retiro
                      </Button>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      {retreatsLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                        </div>
                      ) : retreats.length > 0 ? (
                        <div className="divide-y divide-gris/10 max-h-[450px] overflow-y-auto pr-2">
                          {retreats.map((r) => (
                            <div key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex gap-4 items-center">
                                <img src={r.image} alt={r.title} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-arena" />
                                <div>
                                  <h4 className="font-serif text-lg text-gris font-medium">{r.title}</h4>
                                  <p className="text-xs text-gris/70">
                                    <span className="font-bold text-terracota">{r.location}</span> • {r.date} • <span className="text-salvia font-bold">{r.price}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setRetreatToEdit(r);
                                    setIsRetreatFormOpen(true);
                                  }}
                                  className="rounded-full border border-arena px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gris hover:bg-arena"
                                >
                                  Editar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleDeleteRetreat(r.id)}
                                  className="rounded-full border border-red-200 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                                >
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gris/60 text-sm">
                          No hay retiros registrados. Presiona "Crear Retiro" para añadir uno.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 3. PERSONALIZACIÓN DE INICIO */}
                {activeTab === 'home' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                    <CardHeader className="px-8 pt-8 pb-4">
                      <CardTitle className="font-serif text-2xl text-gris">Diseño y Personalización de Inicio</CardTitle>
                      <p className="text-xs text-gris/60">Edita títulos, imágenes de fondo y descripciones principales de tu Home</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      <AdminHomeSettings onSuccess={() => {}} />
                    </CardContent>
                  </Card>
                )}

                {/* 4. GESTIÓN DE COLABORADORES */}
                {activeTab === 'users' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                    <CardHeader className="px-8 pt-8 pb-4">
                      <CardTitle className="font-serif text-2xl text-gris">Gestión de Colaboradores</CardTitle>
                      <p className="text-xs text-gris/60">Asigna roles administrativos a tus colaboradores</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      {usersLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                        </div>
                      ) : users.length > 0 ? (
                        <div className="divide-y divide-gris/10 max-h-[450px] overflow-y-auto pr-2">
                          {users.map((u) => (
                            <div key={u.uid} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h4 className="font-serif text-lg text-gris font-medium">{u.name || 'Usuario'}</h4>
                                <p className="text-xs text-gris/60">{u.email}</p>
                              </div>
                              <div>
                                <select
                                  value={u.role || 'student'}
                                  disabled={u.uid === userData.uid}
                                  onChange={(e) => handleUpdateRole(u.uid, e.target.value as 'student' | 'instructor' | 'admin')}
                                  className="rounded-full border border-arena bg-arena text-gris px-4 py-2 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-salvia disabled:opacity-50"
                                >
                                  <option value="student">Alumno</option>
                                  <option value="instructor">Instructor</option>
                                  <option value="admin">Administrador</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gris/60 text-sm">
                          No hay usuarios registrados.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* VISTA ESTÁNDAR PARA ALUMNOS */}
            {userData.role !== 'admin' && (
              <>
                <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl">
                  <CardHeader className="px-8 pt-8 pb-4">
                    <CardTitle className="font-serif text-2xl text-gris">Próximas Reservas</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    {studentBookingsLoading ? (
                      <div className="flex justify-center py-6">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                      </div>
                    ) : studentBookings.length > 0 ? (
                      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {studentBookings.map((b) => (
                          <div key={b.id} className="flex justify-between items-center bg-arena/30 p-4 rounded-2xl border border-arena/20">
                            <div>
                              <p className="font-serif text-lg font-semibold text-gris">{b.className}</p>
                              <p className="text-xs text-gris/60 capitalize mt-0.5">
                                📅 {format(new Date(b.classDate), "EEEE d MMM, HH:mm 'hs'", { locale: es })}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleCancelStudentBooking(b.id)}
                              className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 shadow-sm"
                            >
                              Cancelar
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-arena bg-marfil/30 p-12 text-center text-gris/60">
                        <div className="w-16 h-16 rounded-full bg-arena flex items-center justify-center mb-4">
                          <span className="material-symbols-outlined text-salvia">calendar_month</span>
                        </div>
                        <p className="text-lg">No tienes reservas próximas.</p>
                        <Button className="mt-6 rounded-full border border-salvia bg-transparent px-8 py-3 text-xs font-bold uppercase tracking-widest text-salvia hover:bg-salvia hover:text-white transition-colors" onClick={() => navigate('/schedule')}>
                          Explorar Clases
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl">
                  <CardHeader className="px-8 pt-8 pb-4">
                    <CardTitle className="font-serif text-2xl text-gris">Biblioteca de Bienestar</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="group rounded-[24px] bg-arena p-8 cursor-pointer hover:bg-salvia/10 transition-colors border border-transparent hover:border-salvia/20">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-4 text-salvia group-hover:scale-110 transition-transform">
                              ▶
                            </div>
                            <h4 className="font-serif text-xl text-gris mb-2">Meditación Guiada</h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-terracota">15 min • Calma</p>
                        </div>
                        <div className="group rounded-[24px] bg-arena p-8 cursor-pointer hover:bg-salvia/10 transition-colors border border-transparent hover:border-salvia/20">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-4 text-salvia group-hover:scale-110 transition-transform">
                              ▶
                            </div>
                            <h4 className="font-serif text-xl text-gris mb-2">Yoga para dormir</h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-terracota">30 min • Relajación</p>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
