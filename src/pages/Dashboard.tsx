import { useAuthStore, UserData } from '../store/authStore';
import { signOut } from 'firebase/auth';
import { auth, db, getTenantId, storage } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, setDoc, where, addDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useTenantStore } from '../store/tenantStore';
import { AdminClassForm } from '../components/AdminClassForm';
import { AdminRetreatForm } from '../components/AdminRetreatForm';
import { AdminHomeSettings } from '../components/AdminHomeSettings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Copy, 
  Check, 
  ShieldAlert, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Info
} from 'lucide-react';

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
function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}
function RadarChart({ scores }: { scores: { flexibility: number; strength: number; balance: number; endurance: number; mindfulness: number } }) {
  const CX = 100;
  const CY = 100;
  const R = 60;
  
  const categories = [
    { name: 'Flexibilidad', key: 'flexibility', angle: 0 },
    { name: 'Fuerza', key: 'strength', angle: 72 },
    { name: 'Equilibrio', key: 'balance', angle: 144 },
    { name: 'Resistencia', key: 'endurance', angle: 216 },
    { name: 'Enfoque', key: 'mindfulness', angle: 288 }
  ];

  const getCoordinates = (index: number, value: number, radiusMultiplier = 1) => {
    const angleRad = (categories[index].angle * Math.PI) / 180;
    const r = R * (value / 10) * radiusMultiplier;
    return {
      x: CX + r * Math.sin(angleRad),
      y: CY - r * Math.cos(angleRad)
    };
  };

  const levels = [2, 4, 6, 8, 10];
  
  const dataPoints = categories.map((cat, idx) => {
    const val = (scores as any)[cat.key] || 0;
    const { x, y } = getCoordinates(idx, val);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/40 rounded-3xl border border-arena/20 shadow-inner w-full">
      <svg viewBox="0 0 200 200" className="w-full max-w-[190px] h-auto">
        {/* Grids */}
        {levels.map((level) => {
          const points = categories.map((cat, idx) => {
            const { x, y } = getCoordinates(idx, level);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={points}
              fill="none"
              stroke="var(--color-salvia, #8b9c86)"
              strokeWidth="0.5"
              strokeDasharray={level === 10 ? '0' : '2,2'}
              className="opacity-30"
            />
          );
        })}

        {/* Axis lines */}
        {categories.map((cat, idx) => {
          const outer = getCoordinates(idx, 10);
          return (
            <line
              key={cat.key}
              x1={CX}
              y1={CY}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--color-salvia, #8b9c86)"
              strokeWidth="0.5"
              className="opacity-30"
            />
          );
        })}

        {/* Data area */}
        {dataPoints && (
          <polygon
            points={dataPoints}
            fill="var(--color-salvia, #8b9c86)"
            stroke="var(--color-salvia, #8b9c86)"
            strokeWidth="1.5"
            className="fill-salvia/30 stroke-salvia drop-shadow-sm"
          />
        )}

        {/* Data points dots */}
        {categories.map((cat, idx) => {
          const val = (scores as any)[cat.key] || 0;
          const { x, y } = getCoordinates(idx, val);
          return (
            <circle
              key={cat.key}
              cx={x}
              cy={y}
              r="2"
              fill="var(--color-terracota, #c08575)"
              stroke="white"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Text Labels */}
        {categories.map((cat, idx) => {
          const outer = getCoordinates(idx, 10, 1.25);
          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          let dy = '0.35em';
          
          if (cat.angle === 0) dy = '-0.5em';
          else if (cat.angle === 180) dy = '1em';
          else if (cat.angle > 0 && cat.angle < 180) textAnchor = 'start';
          else if (cat.angle > 180 && cat.angle < 360) textAnchor = 'end';

          return (
            <text
              key={cat.key}
              x={outer.x}
              y={outer.y}
              textAnchor={textAnchor}
              dy={dy}
              className="text-[6.5px] font-bold fill-gris/85 uppercase tracking-wider"
            >
              {cat.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ProgressLineChart({ logs }: { logs: any[] }) {
  if (logs.length < 2) {
    return <p className="text-center text-xs text-gris/40 py-8 italic bg-white/30 rounded-2xl border border-arena/10">Se necesitan al menos 2 valoraciones para trazar tu línea de progreso.</p>;
  }

  const width = 300;
  const height = 120;
  const paddingLeft = 30;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const pointsData = logs.map((log, idx) => {
    const scores = log.scores;
    const avg = (scores.flexibility + scores.strength + scores.balance + scores.endurance + scores.mindfulness) / 5;
    const x = paddingLeft + (idx / (logs.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((avg - 1) / 9) * chartHeight;
    return { x, y, avg, date: format(new Date(log.date), 'dd/MM') };
  });

  const pathD = pointsData.reduce((acc, p, idx) => {
    return acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="p-4 bg-white/40 rounded-3xl border border-arena/20 shadow-inner w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {[1, 5, 10].map((val) => {
          const y = paddingTop + chartHeight - ((val - 1) / 9) * chartHeight;
          return (
            <g key={val} className="opacity-25">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--color-gris, #433e3f)" strokeWidth="0.5" strokeDasharray="2,2" />
              <text x={10} y={y + 2.5} className="text-[6.5px] font-bold fill-gris">{val}</text>
            </g>
          );
        })}

        {/* The progress line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--color-salvia, #8b9c86)"
          strokeWidth="1.75"
        />

        {/* Data points */}
        {pointsData.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="2.5"
              fill="var(--color-terracota, #c08575)"
              stroke="white"
              strokeWidth="0.5"
            />
            <text x={p.x} y={p.y - 5} textAnchor="middle" className="text-[5.5px] font-bold fill-gris">
              {p.avg.toFixed(1)}
            </text>
            <text x={p.x} y={height - 8} textAnchor="middle" className="text-[5.5px] font-semibold fill-gris/50">
              {p.date}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Dashboard() {
  const { user, userData, loading, setUserData } = useAuthStore();
  const navigate = useNavigate();
  
  // State for Classes
  const [classes, setClasses] = useState<YogaClass[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<YogaClass | null>(null);

  // State for Bookings & Weekly view
  const [bookings, setBookings] = useState<Record<string, any[]>>({});
  const [viewMode, setViewMode] = useState<'weekly' | 'list'>('weekly');
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

  // Pending roles change state
  const [pendingRoles, setPendingRoles] = useState<Record<string, 'student' | 'instructor' | 'admin'>>({});

  // Payment registration modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedUserForPayment, setSelectedUserForPayment] = useState<UserData | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<'4' | '8' | '12' | 'unlimited' | 'custom'>('8');
  const [customClassesCount, setCustomClassesCount] = useState(8);
  const [paymentExpiry, setPaymentExpiry] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Detailed student file modal state (payment log, date entered)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<UserData | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Student Progress States
  const [isStudentProgressOpen, setIsStudentProgressOpen] = useState(false);
  const [progressLogs, setProgressLogs] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [expedienteTab, setExpedienteTab] = useState<'info' | 'progress'>('info');

  // Progress rating form states
  const [flexibility, setFlexibility] = useState(5);
  const [strength, setStrength] = useState(5);
  const [balance, setBalance] = useState(5);
  const [endurance, setEndurance] = useState(5);
  const [mindfulness, setMindfulness] = useState(5);
  const [progressNotes, setProgressNotes] = useState('');

  // Business metrics states
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allPaymentsLoading, setAllPaymentsLoading] = useState(false);

  // Active Admin/Instructor Tab
  const [activeTab, setActiveTab] = useState<'classes' | 'retreats' | 'home' | 'users' | 'subscriptions' | 'saas_billing' | 'business_metrics' | 'students' | 'library'>('classes');

  // Wellness Library States
  const [wellnessItems, setWellnessItems] = useState<any[]>([]);
  const [wellnessLoading, setWellnessLoading] = useState(false);
  const [wellnessTitle, setWellnessTitle] = useState('');
  const [wellnessDuration, setWellnessDuration] = useState('');
  const [wellnessCategory, setWellnessCategory] = useState('');
  const [wellnessUrl, setWellnessUrl] = useState('');
  const [savingWellness, setSavingWellness] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Privacy Policy States
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [isAcceptingPolicy, setIsAcceptingPolicy] = useState(false);

  const { tenantInfo } = useTenantStore();

  // SaaS Billing States
  const [billingConfig, setBillingConfig] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [saasPlan, setSaasPlan] = useState<'basic' | 'premium' | 'enterprise'>('basic');
  const [reportMethod, setReportMethod] = useState<'upload' | 'whatsapp'>('upload');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferReference, setTransferReference] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [saasError, setSaasError] = useState('');
  const [saasSuccess, setSaasSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const isSuspended = tenantInfo?.status === 'suspended';
  const isExpired = tenantInfo?.subscriptionExpiry 
    ? new Date(tenantInfo.subscriptionExpiry) < new Date() 
    : false;
  const isTrialExpired = tenantInfo?.status === 'trial' && tenantInfo?.trialEndsAt
    ? new Date(tenantInfo.trialEndsAt) < new Date()
    : false;
  const isSaaSSuspended = isSuspended || isExpired || isTrialExpired;

  useEffect(() => {
    if (isSaaSSuspended && activeTab !== 'saas_billing') {
      setActiveTab('saas_billing');
    }
  }, [isSaaSSuspended, activeTab]);

  const loadSaaSData = async () => {
    if (!tenantInfo) return;
    setBillingLoading(true);
    setSaasError('');
    try {
      const configDoc = await getDoc(doc(db, 'settings', 'platform_billing'));
      if (configDoc.exists()) {
        setBillingConfig(configDoc.data());
      } else {
        setBillingConfig({
          bankName: 'Banco Pichincha',
          bankAccountHolder: 'UIO YOGA S.A.S',
          bankAccountNumber: '2206789456',
          bankAccountType: 'Corriente',
          bankTaxId: '1793456789001',
          priceBasic: 30,
          pricePremium: 60,
          priceEnterprise: 120
        });
      }

      const q = query(
        collection(db, 'payments'),
        where('studioId', '==', tenantInfo.id),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBillingHistory(history);
    } catch (err: any) {
      console.error("Error loading SaaS billing data:", err);
      setSaasError('Error al cargar la información de facturación o historial.');
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'saas_billing' && tenantInfo) {
      loadSaaSData();
      if (tenantInfo.subscriptionPlan) {
        setSaasPlan(tenantInfo.subscriptionPlan as any);
      }
    }
  }, [activeTab, tenantInfo]);

  const handleReportPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantInfo) return;
    setUploadingReceipt(true);
    setSaasError('');
    setSaasSuccess('');
    
    try {
      let receiptUrl = '';
      let amount = parseFloat(transferAmount);
      
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto ingresado debe ser mayor a 0.');
      }

      if (reportMethod === 'upload') {
        if (!receiptFile) {
          throw new Error('Por favor selecciona una foto o PDF del comprobante.');
        }
        if (!transferReference.trim()) {
          throw new Error('Por favor ingresa el número de referencia de la transferencia.');
        }
        
        const fileExt = receiptFile.name.split('.').pop();
        const storageRef = ref(storage, `receipts/${tenantInfo.subdomain}/${Date.now()}_receipt.${fileExt}`);
        await uploadBytes(storageRef, receiptFile);
        receiptUrl = await getDownloadURL(storageRef);
      }

      const paymentData: any = {
        studioId: tenantInfo.id,
        subdomain: tenantInfo.subdomain,
        subscriptionPlan: saasPlan,
        amount,
        transferDate,
        referenceNumber: reportMethod === 'upload' ? transferReference : 'WhatsApp/Email-Ref',
        remarks: transferRemarks,
        status: 'pending',
        receiptUploaded: reportMethod === 'upload',
        createdAt: new Date().toISOString()
      };

      if (receiptUrl) {
        paymentData.receiptUrl = receiptUrl;
      }

      await addDoc(collection(db, 'payments'), paymentData);

      setSaasSuccess('¡Pago reportado con éxito! El administrador revisará y activará tu cuenta.');
      setTransferAmount('');
      setTransferReference('');
      setTransferRemarks('');
      setReceiptFile(null);
      loadSaaSData();
    } catch (err: any) {
      console.error("Error reporting payment:", err);
      setSaasError(err.message || 'Error al guardar el reporte de pago.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleCopyAccountNumber = () => {
    const acc = billingConfig?.bankAccountNumber || '2206789456';
    navigator.clipboard.writeText(acc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchClasses = async () => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'instructor')) return;
    setAdminLoading(true);
    try {
      // 1. Fetch classes
      const q = query(collection(db, 'classes'), where('tenantId', '==', getTenantId()), orderBy('date'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YogaClass));
      setClasses(fetched);

      // 2. Fetch bookings
      const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('tenantId', '==', getTenantId())));
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
    if (!user || userData?.role === 'admin' || userData?.role === 'instructor') return;
    setStudentBookingsLoading(true);
    try {
      const q = query(collection(db, 'bookings'), where('tenantId', '==', getTenantId()), where('userId', '==', user.uid));
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
      // 1. Retrieve booking info to refund class credit
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, where('__name__', '==', bookingId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const bookingData = snap.docs[0].data();
        
        // 2. Delete booking
        await deleteDoc(doc(db, 'bookings', bookingId));

        // 3. Increment student class credit
        const userRef = doc(db, 'users', user.uid);
        if (userData && !userData.unlimitedClasses) {
          const newCredits = (userData.classesRemaining || 0) + 1;
          await setDoc(userRef, { classesRemaining: newCredits }, { merge: true });
        }
      }

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
      // 1. Retrieve booking info to refund credits to the student
      const bookingsRef = collection(db, 'bookings');
      const snap = await getDocs(query(bookingsRef, where('__name__', '==', bookingId)));
      if (!snap.empty) {
        const bData = snap.docs[0].data();

        // 2. Delete booking
        await deleteDoc(doc(db, 'bookings', bookingId));

        // 3. Refund credit to student user profile
        const studentRef = doc(db, 'users', bData.userId);
        const studentSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', bData.userId)));
        if (!studentSnap.empty) {
          const studentProfile = studentSnap.docs[0].data();
          if (!studentProfile.unlimitedClasses) {
            const newCredits = (studentProfile.classesRemaining || 0) + 1;
            await setDoc(studentRef, { classesRemaining: newCredits }, { merge: true });
          }
        }
      }

      alert("Alumno removido con éxito.");
      fetchClasses();
      fetchUsers();
    } catch (err) {
      console.error("Error removing student booking:", err);
      alert("No se pudo remover al alumno.");
    }
  };

  const fetchRetreats = async () => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'instructor')) return;
    setRetreatsLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'retreats'), where('tenantId', '==', getTenantId())));
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Retreat));
      setRetreats(fetched);
    } catch (err) {
      console.error("Error fetching retreats for admin:", err);
    } finally {
      setRetreatsLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'instructor')) return;
    setUsersLoading(true);
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), where('tenantId', '==', getTenantId())));
      const fetched = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData));
      setUsers(fetched);
    } catch (err) {
      console.error("Error fetching users for admin:", err);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSaveRole = async (userId: string) => {
    const newRole = pendingRoles[userId];
    if (!newRole) return;
    if (userId === userData.uid) {
      alert("No puedes cambiar tu propio rol.");
      return;
    }
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole }, { merge: true });
      alert("Rol actualizado correctamente.");
      setPendingRoles(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      fetchUsers();
    } catch (err) {
      console.error("Error saving user role:", err);
      alert("No se pudo actualizar el rol.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === userData.uid) {
      alert("No puedes eliminar tu propia cuenta.");
      return;
    }
    if (!window.confirm("¿Estás seguro de que deseas eliminar permanentemente a este usuario? Esta acción es irreversible.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      alert("Usuario eliminado correctamente.");
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("No se pudo eliminar al usuario.");
    }
  };

  const handleDeleteSubscription = async (studentId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas desactivar y eliminar la suscripción activa de este alumno? Su saldo de clases y vigencia volverán a cero.")) return;
    try {
      await setDoc(doc(db, 'users', studentId), {
        subscriptionActive: false,
        classesRemaining: 0,
        unlimitedClasses: false,
        subscriptionExpiry: "",
        subscriptionType: "",
        lastPaymentDate: "",
        lastPaymentAmount: 0
      }, { merge: true });
      alert("Suscripción eliminada con éxito.");
      fetchUsers();
    } catch (err) {
      console.error("Error resetting subscription:", err);
      alert("No se pudo eliminar la suscripción.");
    }
  };

  const openPaymentModal = (student: UserData) => {
    setSelectedUserForPayment(student);
    setPaymentPlan('8');
    setCustomClassesCount(8);
    setPaymentAmount('');
    
    // Default expiration: 30 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    setPaymentExpiry(defaultExpiry.toISOString().split('T')[0]);
    
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPayment) return;
    setPaymentLoading(true);
    
    let classesCount = 0;
    let isUnlimited = false;
    let planType = '';

    if (paymentPlan === '4') {
      classesCount = 4;
      planType = '4 Clases';
    } else if (paymentPlan === '8') {
      classesCount = 8;
      planType = '8 Clases';
    } else if (paymentPlan === '12') {
      classesCount = 12;
      planType = '12 Clases';
    } else if (paymentPlan === 'unlimited') {
      classesCount = 9999;
      isUnlimited = true;
      planType = 'Ilimitado';
    } else {
      classesCount = Number(customClassesCount);
      planType = 'Personalizado';
    }

    try {
      const userRef = doc(db, 'users', selectedUserForPayment.uid);
      
      // 1. Update user profile subscription
      await setDoc(userRef, {
        subscriptionActive: true,
        classesRemaining: classesCount,
        unlimitedClasses: isUnlimited,
        subscriptionType: planType,
        subscriptionExpiry: new Date(paymentExpiry).toISOString(),
        lastPaymentDate: new Date().toISOString(),
        lastPaymentAmount: Number(paymentAmount) || 0
      }, { merge: true });

      // 2. Log in payments history
      await addDoc(collection(db, 'payments'), {
        userId: selectedUserForPayment.uid,
        userName: selectedUserForPayment.name || 'Alumno',
        amount: Number(paymentAmount) || 0,
        planType: planType,
        tenantId: getTenantId(),
        date: new Date().toISOString(),
        expiryDate: new Date(paymentExpiry).toISOString()
      });

      alert(`¡Pago registrado con éxito para ${selectedUserForPayment.name || 'el usuario'}!`);
      setIsPaymentModalOpen(false);
      setSelectedUserForPayment(null);
      fetchUsers();
    } catch (err: any) {
      console.error("Error saving payment details:", err);
      alert("No se pudo registrar el pago: " + (err.message || err));
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchPaymentHistory = async (studentId: string) => {
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, 'payments'),
        where('tenantId', '==', getTenantId()),
        where('userId', '==', studentId),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPaymentHistory(fetched);
    } catch (err) {
      console.error("Error fetching payment history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchStudentProgress = async (studentId: string) => {
    setProgressLoading(true);
    try {
      const q = query(
        collection(db, 'progress_logs'),
        where('tenantId', '==', getTenantId()),
        where('userId', '==', studentId),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProgressLogs(fetched);
    } catch (err) {
      console.error("Error fetching progress logs:", err);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleSaveProgressLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForDetails) return;
    setSavingProgress(true);
    try {
      const newLog = {
        userId: selectedStudentForDetails.uid,
        tenantId: getTenantId(),
        date: new Date().toISOString(),
        instructorName: userData?.name || 'Instructor',
        scores: {
          flexibility: Number(flexibility),
          strength: Number(strength),
          balance: Number(balance),
          endurance: Number(endurance),
          mindfulness: Number(mindfulness)
        },
        notes: progressNotes
      };
      await addDoc(collection(db, 'progress_logs'), newLog);
      setProgressNotes('');
      setFlexibility(5);
      setStrength(5);
      setBalance(5);
      setEndurance(5);
      setMindfulness(5);
      fetchStudentProgress(selectedStudentForDetails.uid);
      alert("¡Valoración de progreso guardada con éxito!");
    } catch (err: any) {
      console.error("Error saving progress log:", err);
      alert("Error al guardar la valoración de progreso: " + (err?.message || err));
    } finally {
      setSavingProgress(false);
    }
  };

  const fetchAllPaymentsForBusiness = async () => {
    setAllPaymentsLoading(true);
    try {
      const q = query(
        collection(db, 'payments'),
        where('tenantId', '==', getTenantId()),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllPayments(fetched);
    } catch (err) {
      console.error("Error fetching all payments for business metrics:", err);
    } finally {
      setAllPaymentsLoading(false);
    }
  };
  const fetchWellnessItems = async () => {
    setWellnessLoading(true);
    try {
      const q = query(
        collection(db, 'wellness_library'),
        where('tenantId', '==', getTenantId()),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWellnessItems(items);
    } catch (err) {
      console.warn("Error fetching wellness items:", err);
    } finally {
      setWellnessLoading(false);
    }
  };

  const handleSaveWellnessItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wellnessTitle.trim() || !wellnessUrl.trim()) {
      alert("Por favor completa el título y la URL.");
      return;
    }
    setSavingWellness(true);
    try {
      const newItem = {
        tenantId: getTenantId(),
        title: wellnessTitle,
        duration: wellnessDuration || '15 min',
        category: wellnessCategory || 'Calma',
        url: wellnessUrl,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'wellness_library'), newItem);
      setWellnessTitle('');
      setWellnessDuration('');
      setWellnessCategory('');
      setWellnessUrl('');
      fetchWellnessItems();
      alert("¡Contenido agregado correctamente!");
    } catch (err) {
      console.error("Error saving wellness item:", err);
      alert("Error al guardar el contenido.");
    } finally {
      setSavingWellness(false);
    }
  };

  const handleDeleteWellnessItem = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este contenido de la biblioteca?")) return;
    try {
      await deleteDoc(doc(db, 'wellness_library', id));
      fetchWellnessItems();
    } catch (err) {
      console.error("Error deleting wellness item:", err);
      alert("No se pudo eliminar el contenido.");
    }
  };
  const handleAcceptPolicy = async () => {
    if (!user || !userData) return;
    setIsAcceptingPolicy(true);
    try {
      const policyAcceptedAt = new Date().toISOString();
      await setDoc(doc(db, 'users', user.uid), {
        acceptedPrivacyPolicy: true,
        policyAcceptedAt
      }, { merge: true });
      
      setUserData({
        ...userData,
        acceptedPrivacyPolicy: true,
        policyAcceptedAt
      });
      alert("¡Gracias! Tu consentimiento ha sido registrado correctamente.");
    } catch (err) {
      console.error("Error accepting privacy policy:", err);
      alert("No se pudo registrar la aceptación de la política. Por favor intenta de nuevo.");
    } finally {
      setIsAcceptingPolicy(false);
    }
  };

  const openDetailsModal = (student: UserData) => {
    setSelectedStudentForDetails(student);
    setExpedienteTab('info');
    fetchPaymentHistory(student.uid);
    if (tenantInfo?.subscriptionPlan === 'premium' || tenantInfo?.subscriptionPlan === 'enterprise') {
      fetchStudentProgress(student.uid);
    }
    setIsDetailsModalOpen(true);
  };

  const calculateMembershipDuration = (createdAtStr?: string) => {
    if (!createdAtStr) return 'Miembro nuevo (menos de 1 mes)';
    const created = new Date(createdAtStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    
    const formattedDate = format(created, "d 'de' MMMM, yyyy", { locale: es });
    if (diffMonths === 0) {
      return `Miembro desde el ${formattedDate} (Menos de 1 mes)`;
    }
    return `Miembro desde el ${formattedDate} (Antigüedad: ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'})`;
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (userData?.role === 'admin' || userData?.role === 'instructor') {
      fetchClasses();
      fetchUsers();
      fetchRetreats();
      fetchWellnessItems();
    } else if (user) {
      fetchStudentBookings();
      fetchWellnessItems();
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

  const getDaysOfWeek = (currentDate: Date) => {
    const temp = new Date(currentDate);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
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

  // Business metrics computations
  const last30DaysPayments = allPayments.filter(p => {
    if (!p.date) return false;
    const pDate = new Date(p.date);
    const diff = Date.now() - pDate.getTime();
    return diff <= 30 * 24 * 60 * 60 * 1000;
  });
  const mrr = last30DaysPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const activeStudentsCount = users.filter(u => u.role === 'student' && u.subscriptionActive).length;
  const totalStudentsCount = users.filter(u => u.role === 'student').length;

  const newStudentsLast30Days = users.filter(u => {
    if (u.role !== 'student' || !u.createdAt) return false;
    const uDate = new Date(u.createdAt);
    const diff = Date.now() - uDate.getTime();
    return diff <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  let totalClassCapacity = 0;
  let totalBookingsCount = 0;
  classes.forEach(c => {
    totalClassCapacity += c.capacity || 0;
    totalBookingsCount += bookings[c.id]?.length || 0;
  });
  const bookingRate = totalClassCapacity > 0 ? ((totalBookingsCount / totalClassCapacity) * 100).toFixed(1) : '0';

  const getMonthlyRevenueData = () => {
    const monthlySums: Record<string, number> = {};
    const monthsList = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM', { locale: es });
      monthlySums[key] = 0;
      monthsList.push({ key, label });
    }

    allPayments.forEach(p => {
      if (!p.date) return;
      const key = p.date.substring(0, 7); // YYYY-MM
      if (monthlySums[key] !== undefined) {
        monthlySums[key] += p.amount || 0;
      }
    });

    return monthsList.map(m => ({ label: m.label, value: monthlySums[m.key] }));
  };
  const revenueData = getMonthlyRevenueData();

  const getClassPopularityData = () => {
    const counts: Record<string, number> = {};
    classes.forEach(c => {
      const title = c.title || 'Clase';
      counts[title] = (counts[title] || 0) + (bookings[c.id]?.length || 0);
    });
    const sorted = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return sorted;
  };
  const classPopularity = getClassPopularityData();

  const getPopularHoursData = () => {
    const counts: Record<string, number> = {};
    classes.forEach(c => {
      if (!c.date) return;
      try {
        const hour = format(new Date(c.date), 'HH:00');
        counts[hour] = (counts[hour] || 0) + (bookings[c.id]?.length || 0);
      } catch (err) {
        // ignore invalid date
      }
    });
    const sorted = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return sorted;
  };
  const popularHours = getPopularHoursData();

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

      {/* MODAL DE POLÍTICA DE PRIVACIDAD Y USO DE DATOS (CONSENTIMIENTO) */}
      {userData && (userData.role === 'student' || userData.role === 'instructor') && !userData.acceptedPrivacyPolicy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-xl rounded-[32px] border-[8px] border-white bg-arena shadow-2xl p-8 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-terracota text-3xl">shield</span>
              <h3 className="font-serif text-2xl text-gris font-bold">Consentimiento y Uso de Datos</h3>
            </div>
            
            <p className="text-xs text-gris/70 mb-4 leading-relaxed">
              En <strong className="text-salvia">{tenantInfo?.name || 'nuestro estudio'}</strong> nos tomamos muy en serio la seguridad y el tratamiento de tu información personal. Por favor lee y acepta las condiciones para ingresar a la plataforma:
            </p>

            <div className="max-h-60 overflow-y-auto bg-white/50 rounded-2xl p-4 border border-arena/30 text-xs text-gris/85 space-y-3 mb-6 scrollbar-thin">
              <p className="font-bold text-salvia">1. Seguimiento Físico y Evolución</p>
              <p>
                Al utilizar esta aplicación, autorizas a que los instructores del estudio registren valoraciones periódicas sobre tu desempeño y condición física (niveles de flexibilidad, fuerza, equilibrio, resistencia y enfoque). Estos datos son estrictamente confidenciales y se utilizarán para adaptar las clases a tus necesidades y prevenir lesiones.
              </p>
              
              <p className="font-bold text-salvia">2. Privacidad y Confidencialidad</p>
              <p>
                Toda la información registrada dentro de esta cuenta (incluyendo tus datos de contacto, historial de pagos, reservas y valoraciones físicas) pertenece exclusivamente al entorno privado de este estudio y no será compartida con terceros externos bajo ninguna circunstancia.
              </p>
              
              <p className="font-bold text-salvia">3. Derechos sobre tus Datos</p>
              <p>
                Como usuario, tienes derecho a solicitar en cualquier momento la consulta, modificación o baja de tu expediente de datos personales comunicándote directamente con la administración del estudio.
              </p>

              <p className="font-bold text-salvia">4. Modificaciones del Servicio</p>
              <p>
                El estudio se reserva el derecho a suspender o dar de baja cuentas que infrinjan las normas de convivencia del centro o que presenten adeudos vencidos en sus membresías.
              </p>
            </div>

            <div className="flex items-start gap-3 mb-6">
              <input 
                id="policyCheckbox"
                type="checkbox" 
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-arena text-salvia focus:ring-salvia cursor-pointer"
              />
              <label htmlFor="policyCheckbox" className="text-xs text-gris/80 leading-relaxed cursor-pointer select-none">
                He leído y acepto expresamente los términos de uso de datos, el registro de valoraciones físicas y las políticas de privacidad del estudio.
              </label>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleAcceptPolicy}
                disabled={!checkboxChecked || isAcceptingPolicy}
                className="flex-1 rounded-full bg-salvia py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 disabled:opacity-55 disabled:cursor-not-allowed shadow-md cursor-pointer transition-opacity"
              >
                {isAcceptingPolicy ? 'Registrando...' : 'Aceptar y Registrar Ingreso'}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut(auth);
                  navigate('/');
                }}
                className="rounded-full border border-arena px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-gris hover:bg-arena cursor-pointer"
              >
                Salir
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL EXPEDIENTE COMPLETO DEL ALUMNO */}
      {isDetailsModalOpen && selectedStudentForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full ${(tenantInfo?.subscriptionPlan === 'premium' || tenantInfo?.subscriptionPlan === 'enterprise') ? 'max-w-3xl' : 'max-w-lg'} rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 relative overflow-hidden`}
          >
            <h3 className="font-serif text-2xl text-gris mb-1">Expediente del Alumno</h3>
            <p className="text-xs text-gris/60 mb-4">Detalles de: <span className="font-bold text-salvia">{selectedStudentForDetails.name}</span></p>

            {/* Selector de pestañas */}
            {(tenantInfo?.subscriptionPlan === 'premium' || tenantInfo?.subscriptionPlan === 'enterprise') && (
              <div className="flex gap-2 mb-6 border-b border-white/40 pb-3">
                <button
                  type="button"
                  onClick={() => setExpedienteTab('info')}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    expedienteTab === 'info' ? 'bg-salvia text-white shadow-sm' : 'bg-white/40 text-gris/70 hover:bg-white/60'
                  }`}
                >
                  Membresía & Caja
                </button>
                <button
                  type="button"
                  onClick={() => setExpedienteTab('progress')}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                    expedienteTab === 'progress' ? 'bg-salvia text-white shadow-sm' : 'bg-white/40 text-gris/70 hover:bg-white/60'
                  }`}
                >
                  Progreso & Valoración
                </button>
              </div>
            )}

            {/* CONTENIDO PESTAÑA INFORMACIÓN / CAJA */}
            {(expedienteTab === 'info' || !(tenantInfo?.subscriptionPlan === 'premium' || tenantInfo?.subscriptionPlan === 'enterprise')) && (
              <div className="space-y-6 text-sm text-gris/85">
                {/* Info de ingreso y antigüedad */}
                <div className="bg-white/60 p-4 rounded-2xl border border-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-1">Ingreso y Antigüedad</p>
                  <p className="font-medium text-gris">{calculateMembershipDuration(selectedStudentForDetails.createdAt)}</p>
                </div>

                {/* Info del plan activo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 p-4 rounded-2xl border border-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-1">Saldo de Clases</p>
                    <p className="text-lg font-bold text-gris">
                      {selectedStudentForDetails.unlimitedClasses ? 'Acceso Ilimitado' : `${selectedStudentForDetails.classesRemaining || 0} disponibles`}
                    </p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-2xl border border-white">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-1">Vencimiento del Pase</p>
                    <p className="text-lg font-medium text-gris">
                      {selectedStudentForDetails.subscriptionExpiry ? format(new Date(selectedStudentForDetails.subscriptionExpiry), 'dd/MM/yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Historial de Pagos / Caja */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-2">Historial de Pagos (Caja)</p>
                  
                  {historyLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                    </div>
                  ) : paymentHistory.length > 0 ? (
                    <div className="border border-arena/40 rounded-2xl overflow-hidden bg-white/50 max-h-[160px] overflow-y-auto pr-1">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-arena/30 text-gris/60 border-b border-arena/20 font-bold uppercase tracking-wider sticky top-0 z-10">
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Plan</th>
                            <th className="p-3">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-arena/10">
                          {paymentHistory.map((h) => (
                            <tr key={h.id} className="text-gris/85">
                              <td className="p-3 font-medium">{format(new Date(h.date), 'dd/MM/yyyy')}</td>
                              <td className="p-3">{h.planType}</td>
                              <td className="p-3 font-bold text-salvia">${h.amount} USD</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center py-6 text-xs text-gris/40 italic bg-white/40 rounded-2xl border border-white">No se han registrado pagos para este alumno.</p>
                  )}
                </div>
              </div>
            )}

            {/* CONTENIDO PESTAÑA PROGRESO & VALORACIONES (PREMIUM & ENTERPRISE) */}
            {expedienteTab === 'progress' && (tenantInfo?.subscriptionPlan === 'premium' || tenantInfo?.subscriptionPlan === 'enterprise') && (
              <div className="grid gap-6 md:grid-cols-2 max-h-[55vh] overflow-y-auto pr-2 no-scrollbar">
                {/* Columna Izquierda: Gráficos e Historial */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-2">Estado Físico & Mental</h4>
                    {progressLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                      </div>
                    ) : progressLogs.length > 0 ? (
                      <>
                        <RadarChart scores={progressLogs[progressLogs.length - 1].scores} />
                        <div className="mt-4 bg-white/70 p-4 rounded-[24px] border border-white shadow-inner grid grid-cols-2 gap-2 text-[9px] text-gris font-bold uppercase tracking-wider">
                          <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                            <span>Flexibilidad</span>
                            <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.flexibility} / 10</span>
                          </div>
                          <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                            <span>Fuerza Física</span>
                            <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.strength} / 10</span>
                          </div>
                          <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                            <span>Equilibrio</span>
                            <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.balance} / 10</span>
                          </div>
                          <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                            <span>Resistencia</span>
                            <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.endurance} / 10</span>
                          </div>
                          <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10 col-span-2">
                            <span>Enfoque / Paz Mental</span>
                            <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.mindfulness} / 10</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-xs text-gris/40 italic bg-white/40 rounded-2xl border border-white">
                        Sin valoraciones corporales aún.
                      </div>
                    )}
                  </div>

                  {progressLogs.length >= 2 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-2">Evolución Temporal</h4>
                      <ProgressLineChart logs={progressLogs} />
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-2">Historial de Evaluaciones</h4>
                    {progressLogs.length > 0 ? (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {[...progressLogs].reverse().map((log) => (
                          <div key={log.id} className="bg-white/60 p-4 rounded-2xl border border-white text-xs space-y-2 shadow-sm">
                            <div className="flex justify-between items-center font-bold text-gris">
                              <span>{format(new Date(log.date), 'dd/MM/yyyy')}</span>
                              <span className="text-[9px] text-salvia bg-salvia/10 px-2 py-0.5 rounded-full">Doc: {log.instructorName}</span>
                            </div>
                            {log.notes && <p className="text-gris/75 italic leading-relaxed">"{log.notes}"</p>}
                            <div className="grid grid-cols-5 gap-1 text-[8px] font-bold text-gris/60 text-center uppercase tracking-tighter pt-2 border-t border-arena/25">
                              <div>Flex: {log.scores.flexibility}</div>
                              <div>Fuerza: {log.scores.strength}</div>
                              <div>Equil: {log.scores.balance}</div>
                              <div>Resis: {log.scores.endurance}</div>
                              <div>Enfoq: {log.scores.mindfulness}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-6 text-xs text-gris/40 italic bg-white/40 rounded-2xl border border-white">No hay comentarios ni valoraciones previas.</p>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Formulario para añadir nueva valoración */}
                <div className="bg-white/50 p-5 rounded-2xl border border-white/60 shadow-inner h-fit space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Registrar Valoración</h4>
                    <p className="text-[10px] text-gris/60 leading-relaxed mt-0.5">Evalúa el rendimiento físico e introspectivo de la práctica del alumno de 1 a 10.</p>
                  </div>

                  <form onSubmit={handleSaveProgressLog} className="space-y-4">
                    {[
                      { label: 'Flexibilidad', state: flexibility, set: setFlexibility },
                      { label: 'Fuerza Física', state: strength, set: setStrength },
                      { label: 'Equilibrio / Postura', state: balance, set: setBalance },
                      { label: 'Resistencia / Respiración', state: endurance, set: setEndurance },
                      { label: 'Enfoque / Paz Mental', state: mindfulness, set: setMindfulness },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between font-bold text-[9px] uppercase tracking-wider text-gris">
                          <span>{item.label}</span>
                          <span className="text-terracota">{item.state} / 10</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={item.state}
                          onChange={(e) => item.set(Number(e.target.value))}
                          className="w-full accent-salvia cursor-pointer h-1 bg-arena/70 rounded-lg appearance-none"
                        />
                      </div>
                    ))}

                    <div className="space-y-1">
                      <Label htmlFor="progressNotesInput" className="text-[9px] font-bold uppercase tracking-widest text-gris opacity-70">Instrucciones y Observaciones</Label>
                      <textarea
                        id="progressNotesInput"
                        rows={3}
                        placeholder="Escribe recomendaciones, posturas a practicar o felicitaciones..."
                        value={progressNotes}
                        onChange={(e) => setProgressNotes(e.target.value)}
                        className="flex w-full rounded-xl border-none bg-white/70 px-3 py-2 text-xs shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={savingProgress}
                      className="w-full rounded-full bg-salvia py-3.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md cursor-pointer"
                    >
                      {savingProgress ? 'Guardando Valoración...' : 'Registrar Valoración'}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-white/20 mt-6">
              <Button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedStudentForDetails(null);
                }}
                className="rounded-full bg-gris px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia shadow-sm"
              >
                Cerrar Expediente
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL REPORTE DE PROGRESO COMPLETO DEL ALUMNO */}
      {isStudentProgressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 relative overflow-hidden"
          >
            <h3 className="font-serif text-3xl text-gris mb-1">Mi Reporte de Progreso</h3>
            <p className="text-xs text-gris/60 mb-6">Tu camino de aprendizaje en <span className="font-bold text-salvia">{tenantInfo?.name || 'UIO Yoga'}</span></p>

            <div className="grid gap-6 md:grid-cols-2 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
              {/* Columna Izquierda: Radar y Línea */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-2">Mi Silueta de Práctica</h4>
                  {progressLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                    </div>
                  ) : progressLogs.length > 0 ? (
                    <>
                      <RadarChart scores={progressLogs[progressLogs.length - 1].scores} />
                      <div className="mt-4 bg-white/70 p-4 rounded-[24px] border border-white shadow-inner grid grid-cols-2 gap-2 text-[9px] text-gris font-bold uppercase tracking-wider">
                        <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                          <span>Flexibilidad</span>
                          <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.flexibility} / 10</span>
                        </div>
                        <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                          <span>Fuerza Física</span>
                          <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.strength} / 10</span>
                        </div>
                        <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                          <span>Equilibrio</span>
                          <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.balance} / 10</span>
                        </div>
                        <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10">
                          <span>Resistencia</span>
                          <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.endurance} / 10</span>
                        </div>
                        <div className="flex justify-between items-center bg-arena/30 px-3 py-2 rounded-xl border border-arena/10 col-span-2">
                          <span>Enfoque / Paz Mental</span>
                          <span className="text-salvia font-serif text-xs font-black">{progressLogs[progressLogs.length - 1].scores.mindfulness} / 10</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-xs text-gris/40 italic bg-white/40 rounded-2xl border border-white">
                      Aún no se han registrado valoraciones corporales de tus instructores. ¡Pronto verás tu progreso aquí!
                    </div>
                  )}
                </div>

                {progressLogs.length >= 2 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 mb-2">Mi Evolución</h4>
                    <ProgressLineChart logs={progressLogs} />
                  </div>
                )}
              </div>

              {/* Columna Derecha: Historial de Notas de los instructores */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Retroalimentación de mis Instructores</h4>
                {progressLogs.length > 0 ? (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {[...progressLogs].reverse().map((log) => (
                      <div key={log.id} className="bg-white/60 p-4 rounded-2xl border border-white text-xs space-y-2 shadow-sm">
                        <div className="flex justify-between items-center font-bold text-gris">
                          <span>{format(new Date(log.date), 'dd/MM/yyyy')}</span>
                          <span className="text-[9px] text-salvia bg-salvia/10 px-2 py-0.5 rounded-full">Prof: {log.instructorName}</span>
                        </div>
                        {log.notes && <p className="text-gris/75 italic leading-relaxed">"{log.notes}"</p>}
                        <div className="grid grid-cols-5 gap-1 text-[8px] font-bold text-gris/60 text-center uppercase tracking-tighter pt-2 border-t border-arena/25">
                          <div>Flex: {log.scores.flexibility}</div>
                          <div>Fuerza: {log.scores.strength}</div>
                          <div>Equil: {log.scores.balance}</div>
                          <div>Resis: {log.scores.endurance}</div>
                          <div>Enfoq: {log.scores.mindfulness}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-xs text-gris/40 italic bg-white/40 rounded-2xl border border-white leading-relaxed">
                    Tus profesores anotarán sus observaciones y recomendaciones aquí a medida que asistas a más clases.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-white/20 mt-6">
              <Button
                onClick={() => {
                  setIsStudentProgressOpen(false);
                  setProgressLogs([]);
                }}
                className="rounded-full bg-gris px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia shadow-sm"
              >
                Cerrar Reporte
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL REPRODUCTOR DE VIDEO DE LA BIBLIOTECA */}
      {isPlayerOpen && selectedVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl rounded-[32px] border-[8px] border-white bg-gris shadow-2xl relative overflow-hidden"
          >
            <button
              type="button"
              onClick={() => {
                setIsPlayerOpen(false);
                setSelectedVideoUrl(null);
              }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white cursor-pointer transition-colors z-20"
              title="Cerrar reproductor"
            >
              ✕
            </button>
            <div className="relative pt-[56.25%] w-full h-0">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideoUrl}?autoplay=1`}
                title="Reproductor de Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full border-none"
              ></iframe>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR PAGOS Y SUSCRIPCIONES */}
      {isPaymentModalOpen && selectedUserForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 relative overflow-hidden"
          >
            <h3 className="font-serif text-2xl text-gris mb-1">Registrar Pago / Pase</h3>
            <p className="text-xs text-gris/60 mb-6">Administrar saldo para: <span className="font-bold text-salvia">{selectedUserForPayment.name}</span></p>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="plan" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Plan o Paquete</Label>
                <select
                  id="plan"
                  value={paymentPlan}
                  onChange={(e) => setPaymentPlan(e.target.value as any)}
                  className="flex h-10 w-full rounded-2xl border-none bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                >
                  <option value="4">4 Clases Mensuales</option>
                  <option value="8">8 Clases Mensuales</option>
                  <option value="12">12 Clases Mensuales</option>
                  <option value="unlimited">Pase Ilimitado Mensual</option>
                  <option value="custom">Saldo Personalizado</option>
                </select>
              </div>

              {paymentPlan === 'custom' && (
                <div className="space-y-1">
                  <Label htmlFor="customCount" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Cantidad de Clases</Label>
                  <Input
                    id="customCount"
                    type="number"
                    min="1"
                    required
                    value={customClassesCount}
                    onChange={(e) => setCustomClassesCount(Number(e.target.value))}
                    className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="expiry" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Fecha de Vencimiento</Label>
                <Input
                  id="expiry"
                  type="date"
                  required
                  value={paymentExpiry}
                  onChange={(e) => setPaymentExpiry(e.target.value)}
                  className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="amount" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Monto de Pago ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ej. $80"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedUserForPayment(null);
                  }}
                  className="rounded-full border border-gris/20 px-6 py-2 text-xs font-bold uppercase tracking-widest text-gris hover:bg-white/50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={paymentLoading}
                  className="rounded-full bg-salvia px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md"
                >
                  {paymentLoading ? 'Guardando...' : 'Registrar'}
                </Button>
              </div>
            </form>
          </motion.div>
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
              {(userData.role === 'admin' || userData.role === 'instructor') ? 'Consola de Control' : 'Tu Santuario'}
            </span>
            <h1 className="mb-2 font-serif text-5xl font-medium text-gris">
              {(userData.role === 'admin' || userData.role === 'instructor') ? 'Administración' : 'Mi Espacio'}
            </h1>
            <p className="text-lg text-gris/70">Hola, <span className="italic font-serif">{userData.name}</span>. Bienvenido a tu panel de control.</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="rounded-full border border-arena px-6 py-2 text-xs font-bold uppercase tracking-widest text-gris hover:bg-arena">
            Cerrar Sesión
          </Button>
        </motion.div>

        {/* TABS DE ADMINISTRACIÓN (SOLO ADMIN E INSTRUCTOR) */}
        {(userData.role === 'admin' || userData.role === 'instructor') && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex overflow-x-auto md:flex-wrap flex-nowrap gap-2 border-b border-arena/30 pb-4 md:pb-6 mb-10 text-xs font-bold uppercase tracking-widest no-scrollbar"
          >
            {!isSaaSSuspended && (
              <>
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                    activeTab === 'classes' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                  }`}
                >
                  Horarios & Clases
                </button>
                <button
                  onClick={() => setActiveTab('retreats')}
                  className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                    activeTab === 'retreats' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                  }`}
                >
                  Retiros
                </button>
                <button
                  onClick={() => {
                    setActiveTab('students');
                    fetchUsers();
                  }}
                  className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                    activeTab === 'students' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                  }`}
                >
                  Estudiantes
                </button>
                <button
                  onClick={() => {
                    setActiveTab('library');
                    fetchWellnessItems();
                  }}
                  className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                    activeTab === 'library' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                  }`}
                >
                  Biblioteca de Bienestar
                </button>

                {userData.role === 'admin' && (
                  <>
                    <button
                      onClick={() => setActiveTab('home')}
                      className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                        activeTab === 'home' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                      }`}
                    >
                      Personalizar Inicio
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                        activeTab === 'users' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                      }`}
                    >
                      Colaboradores
                    </button>
                    <button
                      onClick={() => setActiveTab('subscriptions')}
                      className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                        activeTab === 'subscriptions' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                      }`}
                    >
                      Suscripciones & Caja
                    </button>
                    {tenantInfo?.subscriptionPlan === 'enterprise' && (
                      <button
                        onClick={() => {
                          setActiveTab('business_metrics');
                          fetchAllPaymentsForBusiness();
                        }}
                        className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                          activeTab === 'business_metrics' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                        }`}
                      >
                        Métricas de Negocio
                      </button>
                    )}
                  </>
                )}
              </>
            )}
            {userData.role === 'admin' && (
              <button
                onClick={() => setActiveTab('saas_billing')}
                className={`rounded-full px-6 py-3 transition-all shrink-0 ${
                  activeTab === 'saas_billing' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
                }`}
              >
                Suscripción SaaS
              </button>
            )}
          </motion.div>
        )}

        <div className="grid gap-8 md:grid-cols-3 w-full max-w-full min-w-0 overflow-hidden md:overflow-visible">
          {/* COLUMNA PERFIL */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-1 space-y-8 min-w-0 w-full"
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
                <div className="flex flex-col gap-2 pt-2">
                  <Button className="w-full rounded-full bg-salvia py-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md">
                    Editar Perfil
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleSignOut}
                    className="w-full rounded-full border border-red-200 bg-transparent py-6 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </CardContent>
            </Card>

            {userData.role !== 'admin' && userData.role !== 'instructor' && (
              <Card className="rounded-[32px] border-[8px] border-white bg-arena shadow-xl">
                <CardHeader className="px-8 pt-8 pb-4 border-b border-white/50">
                  <CardTitle className="font-serif text-2xl text-salvia">Mi Suscripción</CardTitle>
                </CardHeader>
                <CardContent className="px-8 py-6 space-y-4 text-gris/80 text-sm">
                  {userData.subscriptionActive ? (
                    <>
                      <div className="flex justify-between items-center border-b border-white/50 pb-2">
                        <span className="text-xs uppercase tracking-widest opacity-60 font-medium">Estado</span>
                        <span className="font-bold text-salvia uppercase text-[10px] bg-salvia/10 px-2.5 py-0.5 rounded-full">Activa</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/50 pb-2">
                        <span className="text-xs uppercase tracking-widest opacity-60 font-medium">Plan</span>
                        <span className="font-semibold text-gris">{userData.subscriptionType || 'Plan Mensual'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/50 pb-2">
                        <span className="text-xs uppercase tracking-widest opacity-60 font-medium">Clases Disponibles</span>
                        <span className="font-bold text-gris text-lg">
                          {userData.unlimitedClasses ? 'Ilimitado' : `${userData.classesRemaining || 0} pases`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-xs uppercase tracking-widest opacity-60 font-medium">Expira el</span>
                        <span className="font-medium text-gris/70">
                          {userData.subscriptionExpiry ? format(new Date(userData.subscriptionExpiry), 'dd/MM/yyyy') : 'N/A'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 space-y-4">
                      <p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-2xl border border-red-100 uppercase tracking-wider">
                        Suscripción Inactiva
                      </p>
                      <p className="text-xs text-gris/60 leading-relaxed">
                        Tu pase mensual no está activo. Ponte en contacto con el instructor o administrador de UIO Yoga para registrar tu pago e iniciar tus clases.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {userData.role !== 'admin' && userData.role !== 'instructor' && (
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
                     {(tenantInfo?.subscriptionPlan === 'premium' || tenantInfo?.subscriptionPlan === 'enterprise') && (
                       <Button 
                         onClick={() => {
                           setIsStudentProgressOpen(true);
                           fetchStudentProgress(user.uid);
                         }}
                         className="mt-6 rounded-full bg-salvia px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md w-full cursor-pointer"
                       >
                         Ver Reporte Completo
                       </Button>
                     )}
                 </CardContent>
              </Card>
            )}
          </motion.div>

          {/* COLUMNA GESTIONES / CONTENIDOS */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 space-y-8 min-w-0 w-full"
          >
            {/* TABS DE ADMINISTACIÓN CONTENIDO CONTRASTADO */}
            {(userData.role === 'admin' || userData.role === 'instructor') && (
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-arena/30 pt-4 mt-2">
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
                          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
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
                          <div className="flex overflow-x-auto lg:overflow-x-visible flex-nowrap lg:grid lg:grid-cols-7 gap-4 pb-4 no-scrollbar w-full">
                            {daysOfWeek.map((day, dIdx) => {
                              const dayClasses = classes.filter(c => isSameDate(new Date(c.date), day));
                              return (
                                <div key={dIdx} className="bg-arena/20 rounded-[24px] p-3 border border-arena/30 flex flex-col min-h-[300px] w-[260px] lg:w-auto shrink-0">
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

                {/* 4. GESTIÓN DE COLABORADORES (CON BOTÓN DE ACEPTAR) */}
                {activeTab === 'users' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                    <CardHeader className="px-8 pt-8 pb-4">
                      <CardTitle className="font-serif text-2xl text-gris">Control de Colaboradores</CardTitle>
                      <p className="text-xs text-gris/60">Asigna roles administrativos e instructores en la plataforma</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      {usersLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                        </div>
                      ) : users.length > 0 ? (
                        <div className="divide-y divide-gris/10 max-h-[450px] overflow-y-auto pr-2">
                          {users.map((u) => {
                            const hasPendingChange = pendingRoles[u.uid] !== undefined && pendingRoles[u.uid] !== u.role;
                            return (
                              <div key={u.uid} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-serif text-lg text-gris font-medium">{u.name || 'Usuario'}</h4>
                                    <span className="capitalize text-[8px] font-bold tracking-wider px-2 py-0.5 bg-arena text-gris/70 rounded-full border border-arena/30">
                                      {u.role}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gris/60 mt-0.5">{u.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <select
                                    value={pendingRoles[u.uid] !== undefined ? pendingRoles[u.uid] : (u.role || 'student')}
                                    disabled={u.uid === userData.uid}
                                    onChange={(e) => {
                                      const val = e.target.value as 'student' | 'instructor' | 'admin';
                                      setPendingRoles(prev => ({ ...prev, [u.uid]: val }));
                                    }}
                                    className="rounded-full border border-arena bg-arena text-gris px-4 py-2 text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-salvia disabled:opacity-50"
                                  >
                                    <option value="student">Alumno</option>
                                    <option value="instructor">Instructor</option>
                                    <option value="admin">Administrador</option>
                                  </select>

                                  {hasPendingChange && (
                                    <Button
                                      onClick={() => handleSaveRole(u.uid)}
                                      className="rounded-full bg-salvia px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-sm"
                                    >
                                      Aceptar
                                    </Button>
                                  )}

                                  {u.uid !== userData.uid && (
                                    <Button
                                      variant="outline"
                                      onClick={() => handleDeleteUser(u.uid)}
                                      className="rounded-full border border-red-200 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                                    >
                                      Eliminar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gris/60 text-sm">
                          No hay colaboradores registrados.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 5. GESTIÓN DE SUSCRIPCIONES & CAJA (CON LOG DE PAGOS) */}
                {activeTab === 'subscriptions' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                    <CardHeader className="px-8 pt-8 pb-4">
                      <CardTitle className="font-serif text-2xl text-gris">Suscripciones & Caja</CardTitle>
                      <p className="text-xs text-gris/60">Gestiona membresías, créditos y consulta expedientes con historial de cobros</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      {usersLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                        </div>
                      ) : users.filter(u => u.role === 'student').length > 0 ? (
                        <div className="divide-y divide-gris/10 max-h-[450px] overflow-y-auto pr-2">
                          {users.filter(u => u.role === 'student').map((u) => (
                            <div key={u.uid} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1.5 flex-1">
                                <h4 className="font-serif text-lg text-gris font-medium">{u.name || 'Alumno'}</h4>
                                <p className="text-xs text-gris/60">{u.email}</p>
                                
                                <div className="mt-2 text-[11px] space-y-1 bg-marfil/65 p-3 rounded-2xl border border-arena/20 w-fit">
                                  <p>
                                    Membresía:{' '}
                                    <span className={`font-bold ${u.subscriptionActive ? 'text-salvia' : 'text-red-500'}`}>
                                      {u.subscriptionActive ? 'Activa' : 'Inactiva'}
                                    </span>
                                  </p>
                                  {u.subscriptionActive && (
                                    <>
                                      <p>Saldo: <span className="font-bold text-gris">{u.unlimitedClasses ? 'Pase Ilimitado' : `${u.classesRemaining} clases`}</span> ({u.subscriptionType})</p>
                                      <p className="text-[9px] text-gris/40 font-semibold">Vence: {u.subscriptionExpiry ? format(new Date(u.subscriptionExpiry), 'dd/MM/yyyy') : 'N/A'}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 items-center">
                                <Button 
                                  onClick={() => openDetailsModal(u)}
                                  className="rounded-full border border-arena bg-transparent px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-gris hover:bg-arena"
                                >
                                  Ver Expediente
                                </Button>
                                <Button 
                                  onClick={() => openPaymentModal(u)}
                                  className="rounded-full bg-salvia px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-sm"
                                >
                                  Registrar Pago
                                </Button>
                                {u.subscriptionActive && (
                                  <Button 
                                    onClick={() => handleDeleteSubscription(u.uid)}
                                    className="rounded-full border border-red-200 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                                  >
                                    Eliminar Suscripción
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gris/60 text-sm">
                          No hay alumnos registrados para administrar suscripciones.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'saas_billing' && (
                  <div className="space-y-8">
                    {/* Mensaje de Advertencia si está Suspendido o Vencido */}
                    {isSaaSSuspended && (
                      <Card className="rounded-[32px] border-[8px] border-white bg-red-50 shadow-xl overflow-hidden p-6 border-red-200">
                        <div className="flex gap-4 items-start">
                          <ShieldAlert className="h-10 w-10 text-red-500 shrink-0" />
                          <div>
                            <h4 className="font-serif text-xl text-red-800 font-semibold mb-1">
                              {isSuspended ? 'Cuenta Suspendida' : 'Suscripción Vencida'}
                            </h4>
                            <p className="text-xs text-red-800/80 leading-relaxed">
                              {isSuspended 
                                ? 'Tu cuenta ha sido temporalmente suspendida. Por favor realiza la transferencia bancaria y reporta el pago para que el administrador de la plataforma la reactive.'
                                : 'Tu suscripción o periodo de prueba ha finalizado. Por favor realiza la transferencia bancaria y reporta el pago a continuación para reactivar el sistema y todas sus funciones de reservas y gestión.'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Columnas del Panel */}
                    <div className="grid gap-8 lg:grid-cols-2">
                      
                      {/* Columna Izquierda: Información Bancaria e Informe de Pago */}
                      <div className="space-y-8">
                        
                        {/* Información Bancaria */}
                        <Card className="rounded-[32px] border-[8px] border-white bg-arena shadow-xl overflow-hidden">
                          <CardHeader className="px-6 pt-6 pb-2">
                            <CardTitle className="font-serif text-xl text-salvia flex items-center gap-2">
                              <CreditCard className="h-5 w-5" /> Información Bancaria de Pago
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-6 text-sm text-gris/85 space-y-3">
                            <p className="text-xs text-gris/60 mb-2 leading-relaxed">
                              Realiza tu transferencia a la cuenta de la plataforma. Guarda tu comprobante en PDF o Imagen para reportarlo:
                            </p>
                            <div className="bg-white/60 p-4 rounded-2xl border border-arena/30 space-y-2.5">
                              <div className="flex justify-between border-b border-arena/20 pb-1.5">
                                <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Banco</span>
                                <span className="font-bold text-gris">{billingConfig?.bankName || 'Banco Pichincha'}</span>
                              </div>
                              <div className="flex justify-between border-b border-arena/20 pb-1.5">
                                <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Titular</span>
                                <span className="font-semibold text-gris">{billingConfig?.bankAccountHolder || 'UIO YOGA S.A.S'}</span>
                              </div>
                              <div className="flex justify-between border-b border-arena/20 pb-1.5 items-center">
                                <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Nro. de Cuenta</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-gris text-base">{billingConfig?.bankAccountNumber || '2206789456'}</span>
                                  <button
                                    type="button"
                                    onClick={handleCopyAccountNumber}
                                    className="p-1.5 hover:bg-arena/55 rounded-lg text-salvia transition-colors cursor-pointer"
                                    title="Copiar número de cuenta"
                                  >
                                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                  </button>
                                </div>
                              </div>
                              <div className="flex justify-between border-b border-arena/20 pb-1.5">
                                <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Tipo de Cuenta</span>
                                <span className="font-semibold text-gris capitalize">{billingConfig?.bankAccountType || 'Corriente'}</span>
                              </div>
                              <div className="flex justify-between pt-0.5">
                                <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Identificación / RUC</span>
                                <span className="font-mono font-bold text-gris">{billingConfig?.bankTaxId || '1793456789001'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Formulario de Reporte */}
                        <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                          <CardHeader className="px-6 pt-6 pb-2">
                            <CardTitle className="font-serif text-xl text-gris">Reportar Transferencia</CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-6">
                            <form onSubmit={handleReportPayment} className="space-y-4">
                              {saasError && (
                                <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-xl flex items-center gap-2 border border-red-500/20">
                                  <AlertCircle className="h-4 w-4 shrink-0" />
                                  <span>{saasError}</span>
                                </div>
                              )}
                              {saasSuccess && (
                                <div className="p-3 bg-green-500/10 text-green-600 text-xs rounded-xl flex items-center gap-2 border border-green-500/20">
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                  <span>{saasSuccess}</span>
                                </div>
                              )}

                              {/* Selector del Método */}
                              <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Método de Envío del Comprobante</Label>
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setReportMethod('upload')}
                                    className={`py-2.5 px-3 text-xs font-bold uppercase tracking-widest rounded-full transition-all border cursor-pointer ${
                                      reportMethod === 'upload'
                                        ? 'bg-salvia text-white border-salvia shadow-sm'
                                        : 'bg-transparent text-gris/60 border-gris/10 hover:bg-arena/20'
                                    }`}
                                  >
                                    Subir Comprobante
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReportMethod('whatsapp')}
                                    className={`py-2.5 px-3 text-xs font-bold uppercase tracking-widest rounded-full transition-all border cursor-pointer ${
                                      reportMethod === 'whatsapp'
                                        ? 'bg-salvia text-white border-salvia shadow-sm'
                                        : 'bg-transparent text-gris/60 border-gris/10 hover:bg-arena/20'
                                    }`}
                                  >
                                    WhatsApp / Correo
                                  </button>
                                </div>
                              </div>

                              {/* Plan a Renovar */}
                              <div className="space-y-1">
                                <Label htmlFor="saasPlan" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Plan a Contratar/Renovar</Label>
                                <select
                                  id="saasPlan"
                                  value={saasPlan}
                                  onChange={(e: any) => setSaasPlan(e.target.value)}
                                  className="flex h-10 w-full rounded-2xl border-none bg-arena/35 px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                                >
                                  <option value="basic">Plan Básico (${billingConfig?.priceBasic || 30.00}/mes)</option>
                                  <option value="premium">Plan Premium (${billingConfig?.pricePremium || 60.00}/mes)</option>
                                  <option value="enterprise">Plan Enterprise (${billingConfig?.priceEnterprise || 120.00}/mes)</option>
                                </select>
                              </div>

                              {/* Monto */}
                              <div className="space-y-1">
                                <Label htmlFor="transferAmount" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Monto Transferido ($ USD)</Label>
                                <Input
                                  id="transferAmount"
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  required
                                  value={transferAmount}
                                  onChange={(e) => setTransferAmount(e.target.value)}
                                  className="rounded-2xl border-none bg-arena/35 shadow-inner focus:ring-1 focus:ring-salvia"
                                />
                              </div>

                              {/* Fecha */}
                              <div className="space-y-1">
                                <Label htmlFor="transferDate" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Fecha de Transferencia</Label>
                                <Input
                                  id="transferDate"
                                  type="date"
                                  required
                                  value={transferDate}
                                  onChange={(e) => setTransferDate(e.target.value)}
                                  className="rounded-2xl border-none bg-arena/35 shadow-inner focus:ring-1 focus:ring-salvia"
                                />
                              </div>

                              {/* Campos Específicos del Método 1 */}
                              {reportMethod === 'upload' ? (
                                <>
                                  <div className="space-y-1">
                                    <Label htmlFor="transferReference" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Número de Referencia de Transacción</Label>
                                    <Input
                                      id="transferReference"
                                      type="text"
                                      placeholder="Ej. 123456789"
                                      required
                                      value={transferReference}
                                      onChange={(e) => setTransferReference(e.target.value)}
                                      className="rounded-2xl border-none bg-arena/35 shadow-inner focus:ring-1 focus:ring-salvia"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label htmlFor="receiptFile" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Archivo del Comprobante (Imagen o PDF)</Label>
                                    <input
                                      id="receiptFile"
                                      type="file"
                                      accept="image/*,application/pdf"
                                      required
                                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                      className="block w-full text-xs text-gris/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-salvia/10 file:text-salvia hover:file:bg-salvia/20"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="p-3 bg-arena/40 rounded-2xl border border-arena/20 text-xs text-gris/70 leading-relaxed">
                                  <strong>Nota:</strong> Usando esta opción, indicas que ya realizaste la transferencia y nos enviaste el comprobante por WhatsApp o correo. El administrador revisará la cuenta bancaria de forma manual para activar tu suscripción.
                                </div>
                              )}

                              {/* Observaciones */}
                              <div className="space-y-1">
                                <Label htmlFor="transferRemarks" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Observaciones (Opcional)</Label>
                                <textarea
                                  id="transferRemarks"
                                  rows={2}
                                  placeholder="Escribe alguna nota aclaratoria si lo deseas..."
                                  value={transferRemarks}
                                  onChange={(e) => setTransferRemarks(e.target.value)}
                                  className="flex w-full rounded-2xl border-none bg-arena/35 px-4 py-3 text-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                                />
                              </div>

                              <Button
                                type="submit"
                                disabled={uploadingReceipt}
                                className="w-full rounded-full bg-salvia py-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md cursor-pointer"
                              >
                                {uploadingReceipt ? 'Enviando Reporte...' : 'Reportar Pago'}
                              </Button>
                            </form>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Columna Derecha: Estado de Suscripción e Historial */}
                      <div className="space-y-8">
                        
                        {/* Estado Actual */}
                        <Card className="rounded-[32px] border-[8px] border-white bg-arena/25 shadow-xl overflow-hidden">
                          <CardHeader className="px-6 pt-6 pb-2">
                            <CardTitle className="font-serif text-xl text-gris">Detalle de Suscripción SaaS</CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-6 text-sm text-gris/85 space-y-4">
                            <div className="flex justify-between items-center border-b border-arena/20 pb-2">
                              <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Plan Actual</span>
                              <span className="font-bold text-gris capitalize text-base">{tenantInfo?.subscriptionPlan || 'Básico'}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-arena/20 pb-2">
                              <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Precio Estimado</span>
                              <span className="font-bold text-gris">
                                {tenantInfo?.subscriptionPlan === 'enterprise' 
                                  ? `$${billingConfig?.priceEnterprise || 120.00}` 
                                  : tenantInfo?.subscriptionPlan === 'premium'
                                    ? `$${billingConfig?.pricePremium || 60.00}`
                                    : `$${billingConfig?.priceBasic || 30.00}`
                                } / mes
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-b border-arena/20 pb-2">
                              <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Fecha de Vencimiento</span>
                              <span className="font-bold text-gris">
                                {tenantInfo?.subscriptionExpiry ? new Date(tenantInfo.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pb-1">
                              <span className="opacity-60 text-xs uppercase tracking-wider font-semibold">Estado de Cuenta</span>
                              <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                                !isSaaSSuspended 
                                  ? 'bg-green-500/20 text-green-600'
                                  : 'bg-red-500/20 text-red-600'
                              }`}>
                                {!isSaaSSuspended ? 'Activa' : isSuspended ? 'Suspendida' : 'Vencida'}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Historial de Pagos */}
                        <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden">
                          <CardHeader className="px-6 pt-6 pb-2">
                            <CardTitle className="font-serif text-xl text-gris">Historial de Reportes</CardTitle>
                          </CardHeader>
                          <CardContent className="px-6 pb-6">
                            {billingLoading ? (
                              <div className="flex justify-center py-6">
                                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                              </div>
                            ) : billingHistory.length > 0 ? (
                              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                                {billingHistory.map((pay) => (
                                  <div key={pay.id} className="p-4 bg-arena/35 rounded-2xl border border-arena/25 text-xs space-y-2 shadow-inner">
                                    <div className="flex justify-between items-center">
                                      <span className="font-semibold text-gris/70">
                                        📅 {new Date(pay.createdAt).toLocaleDateString()}
                                      </span>
                                      <span className={`font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-full ${
                                        pay.status === 'approved' 
                                          ? 'bg-green-500/20 text-green-600' 
                                          : pay.status === 'rejected'
                                            ? 'bg-red-500/20 text-red-600'
                                            : 'bg-amber-500/20 text-amber-600'
                                      }`}>
                                        {pay.status === 'approved' ? 'Aprobado' : pay.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-gris/80">
                                      <p>Monto: <strong className="text-gris">${pay.amount.toFixed(2)}</strong></p>
                                      <p>Plan: <strong className="text-gris capitalize">{pay.subscriptionPlan}</strong></p>
                                      <p className="col-span-2">Referencia: <strong className="text-gris font-mono">{pay.referenceNumber}</strong></p>
                                      {pay.receiptUrl && (
                                        <p className="col-span-2">
                                          Comprobante:{' '}
                                          <a href={pay.receiptUrl} target="_blank" rel="noreferrer" className="text-salvia underline font-medium hover:text-salvia/80">
                                            Ver Archivo
                                          </a>
                                        </p>
                                      )}
                                    </div>
                                    {pay.status === 'approved' && pay.processedAt && (
                                      <div className="mt-1.5 pt-1.5 border-t border-arena/50 text-[10px] text-salvia font-medium">
                                        Activado el: {new Date(pay.processedAt).toLocaleDateString()}
                                        {pay.activationNotes && <p className="text-gris/65 font-normal mt-0.5">Nota: "{pay.activationNotes}"</p>}
                                      </div>
                                    )}
                                    {pay.status === 'rejected' && pay.rejectedReason && (
                                      <div className="mt-1.5 pt-1.5 border-t border-arena/50 text-[10px] text-red-500 font-semibold">
                                        Motivo de rechazo: "{pay.rejectedReason}"
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-gris/50 text-xs">
                                No se registran pagos reportados anteriormente.
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'business_metrics' && tenantInfo?.subscriptionPlan === 'enterprise' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden animate-fadeIn">
                    <CardHeader className="px-8 pt-8 pb-4">
                      <CardTitle className="font-serif text-2xl text-gris">Métricas de Negocio</CardTitle>
                      <p className="text-xs text-gris/60">Analiza el rendimiento comercial, afluencia y reservas en tu estudio de yoga.</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 space-y-8">
                      {/* KPIs grid */}
                      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                        <div className="bg-arena/30 p-4 rounded-2xl border border-arena/20 text-center space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-terracota">Ingresos (Últ. 30d)</p>
                          <p className="text-2xl font-serif font-bold text-salvia">${mrr.toFixed(2)}</p>
                        </div>
                        <div className="bg-arena/30 p-4 rounded-2xl border border-arena/20 text-center space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-terracota">Miembros Activos</p>
                          <p className="text-2xl font-serif font-bold text-gris">{activeStudentsCount} / {totalStudentsCount}</p>
                        </div>
                        <div className="bg-arena/30 p-4 rounded-2xl border border-arena/20 text-center space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-terracota">Ocupación Promedio</p>
                          <p className="text-2xl font-serif font-bold text-gris">{bookingRate}%</p>
                        </div>
                        <div className="bg-arena/30 p-4 rounded-2xl border border-arena/20 text-center space-y-1">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-terracota">Nuevos Alumnos (30d)</p>
                          <p className="text-2xl font-serif font-bold text-gris">+{newStudentsLast30Days}</p>
                        </div>
                      </div>

                      {/* Charts Grid */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Revenue line chart */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-gris opacity-70">Tendencia de Ingresos Mensuales</h4>
                          {allPaymentsLoading ? (
                            <div className="flex justify-center py-10 bg-arena/20 rounded-3xl border border-arena/20">
                              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                            </div>
                          ) : (
                            <div className="p-4 bg-arena/20 rounded-3xl border border-arena/20 shadow-inner">
                              {revenueData.some(d => d.value > 0) ? (
                                <svg viewBox="0 0 350 140" className="w-full h-auto">
                                  {/* Grid lines */}
                                  {[0, 0.5, 1].map((ratio) => {
                                    const maxVal = Math.max(...revenueData.map(d => d.value), 100);
                                    const val = Math.round(maxVal * ratio);
                                    const y = 15 + (1 - ratio) * 90;
                                    return (
                                      <g key={ratio} className="opacity-25">
                                        <line x1={35} y1={y} x2={335} y2={y} stroke="var(--color-gris, #433e3f)" strokeWidth="0.5" strokeDasharray="2,2" />
                                        <text x={5} y={y + 2.5} className="text-[6.5px] font-bold fill-gris">${val}</text>
                                      </g>
                                    );
                                  })}

                                  {/* Line path */}
                                  {(() => {
                                    const maxVal = Math.max(...revenueData.map(d => d.value), 100);
                                    const points = revenueData.map((d, idx) => {
                                      const x = 40 + (idx / 5) * 280;
                                      const y = 15 + 90 - (d.value / maxVal) * 90;
                                      return { x, y, val: d.value };
                                    });
                                    const pathD = points.reduce((acc, p, idx) => acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                                    return (
                                      <>
                                        <path d={pathD} fill="none" stroke="var(--color-salvia, #8b9c86)" strokeWidth="2" />
                                        {points.map((p, idx) => (
                                          <g key={idx}>
                                            <circle cx={p.x} cy={p.y} r="2.5" fill="var(--color-terracota, #c08575)" stroke="white" strokeWidth="0.5" />
                                            <text x={p.x} y={p.y - 5} textAnchor="middle" className="text-[5.5px] font-bold fill-gris">${p.val.toFixed(0)}</text>
                                            <text x={p.x} y={125} textAnchor="middle" className="text-[5.5px] font-semibold fill-gris/50">{revenueData[idx].label}</text>
                                          </g>
                                        ))}
                                      </>
                                    );
                                  })()}
                                </svg>
                              ) : (
                                <p className="text-center text-xs text-gris/40 py-10 italic">No se registran pagos de membresía en los últimos 6 meses.</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Popular Classes Bar Chart */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-gris opacity-70">Clases Más Reservadas (Top 5)</h4>
                          <div className="p-4 bg-arena/20 rounded-3xl border border-arena/20 shadow-inner">
                            {classPopularity.length > 0 ? (
                              <svg viewBox="0 0 350 140" className="w-full h-auto">
                                {classPopularity.map((d, idx) => {
                                  const maxVal = Math.max(...classPopularity.map(c => c.value), 1);
                                  const barWidth = (d.value / maxVal) * 200;
                                  const y = 10 + idx * 25;
                                  return (
                                    <g key={idx}>
                                      {/* Class Name */}
                                      <text x={5} y={y + 12} className="text-[6.5px] font-bold fill-gris" textAnchor="start">
                                        {d.label.length > 18 ? d.label.substring(0, 18) + '..' : d.label}
                                      </text>
                                      {/* Bar */}
                                      <rect
                                        x={100}
                                        y={y + 4}
                                        width={barWidth || 5}
                                        height={10}
                                        rx={5}
                                        fill="var(--color-salvia, #8b9c86)"
                                        className="fill-salvia/75"
                                      />
                                      {/* Count Text */}
                                      <text x={105 + barWidth} y={y + 12} className="text-[6.5px] font-bold fill-gris">
                                        {d.value} reserv.
                                      </text>
                                    </g>
                                  );
                                })}
                              </svg>
                            ) : (
                              <p className="text-center text-xs text-gris/40 py-10 italic">Aún no hay reservas registradas en las clases.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Extra Metrics List */}
                      <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-arena/20">
                        {/* Popular hour slots */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-gris opacity-70">Horas Pico de Afluencia</h4>
                          <div className="bg-arena/10 rounded-2xl p-4 border border-arena/10 space-y-2">
                            {popularHours.length > 0 ? (
                              popularHours.map((h, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs border-b border-arena/10 pb-1.5 last:border-0 last:pb-0">
                                  <span className="font-semibold text-gris">Slot Horario: {h.label} hs</span>
                                  <span className="text-[10px] font-bold text-salvia bg-salvia/10 px-2 py-0.5 rounded-full">{h.value} reservas registradas</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-xs text-gris/40 py-4 italic">No hay clases programadas con reservas.</p>
                            )}
                          </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="bg-terracota/5 rounded-2xl p-6 border border-terracota/10 flex flex-col justify-center space-y-3">
                          <h4 className="font-serif text-lg text-terracota font-bold">Resumen de Operación</h4>
                          <p className="text-xs text-gris/75 leading-relaxed">
                            Tu tasa de ocupación actual de clases es del <strong>{bookingRate}%</strong>.
                            El servicio ha generado un volumen total de <strong>${allPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)} USD</strong> en transacciones totales registradas históricamente.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'students' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden animate-fadeIn">
                    <CardHeader className="px-8 pt-8 pb-4">
                      <CardTitle className="font-serif text-2xl text-gris">Estudiantes del Estudio</CardTitle>
                      <p className="text-xs text-gris/60">Lista de alumnos de yoga. Registra valoraciones de flexibilidad, fuerza y equilibrio.</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                      {usersLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                        </div>
                      ) : users.filter(u => u.role === 'student').length > 0 ? (
                        <div className="divide-y divide-gris/10 max-h-[500px] overflow-y-auto pr-2">
                          {users.filter(u => u.role === 'student').map((u) => (
                            <div key={u.uid} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h4 className="font-serif text-lg text-gris font-medium">{u.name || 'Alumno'}</h4>
                                <p className="text-xs text-gris/60">{u.email}</p>
                                <p className="text-[10px] text-terracota font-bold uppercase mt-1">
                                  Membresía: <span className={u.subscriptionActive ? 'text-salvia' : 'text-red-500'}>{u.subscriptionActive ? 'Activa' : 'Inactiva'}</span>
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => {
                                    openDetailsModal(u);
                                    setExpedienteTab('progress');
                                  }}
                                  className="rounded-full bg-salvia px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md cursor-pointer"
                                >
                                  Valorar Progreso
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    openDetailsModal(u);
                                    setExpedienteTab('info');
                                  }}
                                  className="rounded-full border border-arena px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gris hover:bg-arena"
                                >
                                  Ver Expediente
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gris/60 text-sm">
                          No hay alumnos registrados en este estudio.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {activeTab === 'library' && (
                  <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden animate-fadeIn">
                    <CardHeader className="px-8 pt-8 pb-4">
                      <CardTitle className="font-serif text-2xl text-gris">Biblioteca de Bienestar</CardTitle>
                      <p className="text-xs text-gris/60">Gestiona el material audiovisual y meditaciones de tu estudio.</p>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 space-y-8">
                      {/* Formulario de subida */}
                      <div className="bg-arena/20 p-6 rounded-[24px] border border-arena/30 space-y-4">
                        <h4 className="font-serif text-lg text-terracota font-bold">Subir Nuevo Contenido</h4>
                        <form onSubmit={handleSaveWellnessItem} className="grid gap-4 md:grid-cols-2 text-xs">
                          <div className="space-y-1">
                            <Label htmlFor="wellTitle" className="text-[10px] font-bold uppercase tracking-widest text-gris opacity-70">Título del Contenido</Label>
                            <Input 
                              id="wellTitle"
                              required
                              placeholder="Ej. Meditación de la mañana"
                              value={wellnessTitle}
                              onChange={(e) => setWellnessTitle(e.target.value)}
                              className="rounded-xl border-none bg-white px-3 py-2 shadow-inner"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="wellUrl" className="text-[10px] font-bold uppercase tracking-widest text-gris opacity-70">Enlace (YouTube, Vimeo, MP4, etc.)</Label>
                            <Input 
                              id="wellUrl"
                              required
                              placeholder="https://www.youtube.com/watch?v=..."
                              value={wellnessUrl}
                              onChange={(e) => setWellnessUrl(e.target.value)}
                              className="rounded-xl border-none bg-white px-3 py-2 shadow-inner"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="wellDur" className="text-[10px] font-bold uppercase tracking-widest text-gris opacity-70">Duración (Ej. 15 min)</Label>
                            <Input 
                              id="wellDur"
                              placeholder="Ej. 20 min"
                              value={wellnessDuration}
                              onChange={(e) => setWellnessDuration(e.target.value)}
                              className="rounded-xl border-none bg-white px-3 py-2 shadow-inner"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="wellCat" className="text-[10px] font-bold uppercase tracking-widest text-gris opacity-70">Categoría (Ej. Calma, Fuerza)</Label>
                            <Input 
                              id="wellCat"
                              placeholder="Ej. Relajación"
                              value={wellnessCategory}
                              onChange={(e) => setWellnessCategory(e.target.value)}
                              className="rounded-xl border-none bg-white px-3 py-2 shadow-inner"
                            />
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                            <Button
                              type="submit"
                              disabled={savingWellness}
                              className="rounded-full bg-salvia px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md cursor-pointer"
                            >
                              {savingWellness ? 'Subiendo...' : 'Agregar Contenido'}
                            </Button>
                          </div>
                        </form>
                      </div>

                      {/* Lista de contenidos */}
                      <div className="space-y-4">
                        <h4 className="font-serif text-xl text-gris font-medium">Contenidos Disponibles</h4>
                        {wellnessLoading ? (
                          <div className="flex justify-center py-6">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                          </div>
                        ) : wellnessItems.length > 0 ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {wellnessItems.map((item) => (
                              <div key={item.id} className="bg-arena/20 p-5 rounded-2xl border border-arena/30 flex justify-between items-start gap-4">
                                <div>
                                  <h5 className="font-serif text-lg text-gris font-medium line-clamp-1">{item.title}</h5>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-terracota mt-1">
                                    {item.duration} • {item.category}
                                  </p>
                                  <p className="text-[9px] text-gris/50 truncate max-w-[200px] mt-1 font-mono">{item.url}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDeleteWellnessItem(item.id)}
                                  className="p-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl cursor-pointer"
                                >
                                  Eliminar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-center py-6 text-xs text-gris/40 italic bg-arena/10 rounded-2xl border border-arena/25">No hay contenido subido a la biblioteca.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* VISTA ESTÁNDAR PARA ALUMNOS */}
            {userData.role !== 'admin' && userData.role !== 'instructor' && (
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
                    {wellnessLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                      </div>
                    ) : wellnessItems.length > 0 ? (
                      <div className="grid gap-6 sm:grid-cols-2">
                        {wellnessItems.map((item) => {
                          const ytId = getYouTubeId(item.url);
                          return (
                            <div 
                              key={item.id} 
                              onClick={() => {
                                if (ytId) {
                                  setSelectedVideoUrl(ytId);
                                  setIsPlayerOpen(true);
                                } else {
                                  window.open(item.url, '_blank');
                                }
                              }}
                              className="group rounded-[24px] bg-arena p-8 cursor-pointer hover:bg-salvia/10 transition-colors border border-transparent hover:border-salvia/20 flex flex-col justify-between min-h-[160px]"
                            >
                              <div>
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-4 text-salvia group-hover:scale-110 transition-transform shadow-sm">
                                  ▶
                                </div>
                                <h4 className="font-serif text-xl text-gris mb-2 group-hover:text-salvia transition-colors">{item.title}</h4>
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-terracota">
                                {item.duration} • {item.category}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gris/50 text-xs">
                        Aún no se ha subido contenido a la biblioteca del estudio. ¡Pronto verás videos y meditaciones aquí!
                      </div>
                    )}
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
