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
  Shield,
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
    <div className="flex flex-col items-center justify-center p-5 bg-[#141416] rounded-3xl border border-white/15 shadow-2xl w-full">
      <svg viewBox="0 0 200 200" className="w-full max-w-[210px] h-auto overflow-visible">
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
              stroke="#ffffff"
              strokeWidth="0.75"
              strokeDasharray={level === 10 ? '0' : '2,2'}
              className="opacity-25"
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
              stroke="#ffffff"
              strokeWidth="0.75"
              className="opacity-25"
            />
          );
        })}

        {/* Data area */}
        {dataPoints && (
          <polygon
            points={dataPoints}
            fill="#9ca688"
            fillOpacity="0.35"
            stroke="#9ca688"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0px 0px 6px rgba(156, 166, 136, 0.6))' }}
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
              r="3"
              fill="#c9856d"
              stroke="#ffffff"
              strokeWidth="1"
            />
          );
        })}

        {/* Text Labels */}
        {categories.map((cat, idx) => {
          const outer = getCoordinates(idx, 10, 1.3);
          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          let dy = '0.35em';
          
          if (cat.angle === 0) dy = '-0.6em';
          else if (cat.angle === 180) dy = '1.1em';
          else if (cat.angle > 0 && cat.angle < 180) textAnchor = 'start';
          else if (cat.angle > 180 && cat.angle < 360) textAnchor = 'end';

          return (
            <text
              key={cat.key}
              x={outer.x}
              y={outer.y}
              textAnchor={textAnchor}
              dy={dy}
              className="text-[7.5px] font-black fill-white uppercase tracking-wider drop-shadow-md"
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
    return <p className="text-center text-xs text-white/50 py-8 italic bg-[#141416] rounded-2xl border border-white/10">Se necesitan al menos 2 valoraciones para trazar tu línea de progreso.</p>;
  }

  const width = 300;
  const height = 130;
  const paddingLeft = 30;
  const paddingRight = 20;
  const paddingTop = 20;
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
    <div className="p-4 bg-[#141416] rounded-3xl border border-white/15 shadow-2xl w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {[1, 5, 10].map((val) => {
          const y = paddingTop + chartHeight - ((val - 1) / 9) * chartHeight;
          return (
            <g key={val} className="opacity-30">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#ffffff" strokeWidth="0.75" strokeDasharray="2,2" />
              <text x={10} y={y + 2.5} className="text-[7px] font-bold fill-white/70">{val}</text>
            </g>
          );
        })}

        {/* The progress line */}
        <path
          d={pathD}
          fill="none"
          stroke="#9ca688"
          strokeWidth="2.5"
          style={{ filter: 'drop-shadow(0px 0px 5px rgba(156, 166, 136, 0.5))' }}
        />

        {/* Data points */}
        {pointsData.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="#c9856d"
              stroke="#ffffff"
              strokeWidth="1"
            />
            <text x={p.x} y={p.y - 6} textAnchor="middle" className="text-[6.5px] font-black fill-white drop-shadow-sm">
              {p.avg.toFixed(1)}
            </text>
            <text x={p.x} y={height - 5} textAnchor="middle" className="text-[6.5px] font-bold fill-white/60">
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
  const [activeTab, setActiveTab] = useState<'retreats' | 'home' | 'users' | 'subscriptions' | 'saas_billing' | 'business_metrics' | 'students' | 'library'>('students');

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
              <Shield className="text-terracota h-7 w-7 shrink-0" />
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
                className="mt-1 h-4 w-4 rounded border-arena text-salvia focus:ring-salvia cursor-pointer shrink-0"
              />
              <label htmlFor="policyCheckbox" className="text-xs text-gris/80 leading-relaxed cursor-pointer select-none">
                He leído y acepto expresamente los términos de uso de datos, el registro de valoraciones físicas y las políticas de privacidad del estudio.
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAcceptPolicy}
                disabled={!checkboxChecked || isAcceptingPolicy}
                className="w-full sm:flex-1 rounded-full bg-salvia py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 disabled:opacity-55 disabled:cursor-not-allowed shadow-md cursor-pointer transition-opacity text-center"
              >
                {isAcceptingPolicy ? 'Registrando...' : 'Aceptar e Ingresar'}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await signOut(auth);
                  navigate('/');
                }}
                className="w-full sm:w-28 rounded-full border border-arena px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-gris hover:bg-arena cursor-pointer text-center"
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
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    expedienteTab === 'info' ? 'bg-salvia text-black shadow-md' : 'bg-black/30 text-white/70 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  Membresía & Caja
                </button>
                <button
                  type="button"
                  onClick={() => setExpedienteTab('progress')}
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    expedienteTab === 'progress' ? 'bg-salvia text-black shadow-md' : 'bg-black/30 text-white/70 hover:bg-white/10 border border-white/10'
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
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold uppercase tracking-wider">
                          <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                            <span className="text-white/80 text-[10px]">Flexibilidad</span>
                            <span className="text-salvia font-serif text-sm font-black bg-salvia/15 px-2 py-0.5 rounded-lg border border-salvia/30">
                              {progressLogs[progressLogs.length - 1].scores.flexibility} / 10
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                            <span className="text-white/80 text-[10px]">Fuerza Física</span>
                            <span className="text-amber-300 font-serif text-sm font-black bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              {progressLogs[progressLogs.length - 1].scores.strength} / 10
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                            <span className="text-white/80 text-[10px]">Equilibrio</span>
                            <span className="text-indigo-300 font-serif text-sm font-black bg-indigo-500/15 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                              {progressLogs[progressLogs.length - 1].scores.balance} / 10
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                            <span className="text-white/80 text-[10px]">Resistencia</span>
                            <span className="text-terracota font-serif text-sm font-black bg-terracota/15 px-2 py-0.5 rounded-lg border border-terracota/30">
                              {progressLogs[progressLogs.length - 1].scores.endurance} / 10
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm col-span-2">
                            <span className="text-white/80 text-[10px]">Enfoque / Paz Mental</span>
                            <span className="text-cyan-300 font-serif text-sm font-black bg-cyan-500/15 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                              {progressLogs[progressLogs.length - 1].scores.mindfulness} / 10
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-xs text-white/50 italic bg-[#141416] rounded-2xl border border-white/10">
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
                      <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                        {[...progressLogs].reverse().map((log) => (
                          <div key={log.id} className="bg-[#18181b] p-4 rounded-2xl border border-white/10 text-xs space-y-2.5 shadow-md">
                            <div className="flex justify-between items-center font-bold text-white">
                              <span>{format(new Date(log.date), 'dd/MM/yyyy')}</span>
                              <span className="text-[10px] font-semibold text-salvia bg-salvia/15 border border-salvia/30 px-2.5 py-0.5 rounded-full">
                                Doc: {log.instructorName}
                              </span>
                            </div>
                            {log.notes && (
                              <p className="text-white/85 italic leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                                "{log.notes}"
                              </p>
                            )}
                            <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-white/70 text-center uppercase tracking-wider pt-2 border-t border-white/10">
                              <div className="bg-salvia/10 p-1 rounded-lg border border-salvia/20 text-salvia">Flex: {log.scores.flexibility}</div>
                              <div className="bg-amber-500/10 p-1 rounded-lg border border-amber-500/20 text-amber-300">Fuerza: {log.scores.strength}</div>
                              <div className="bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/20 text-indigo-300">Equil: {log.scores.balance}</div>
                              <div className="bg-terracota/10 p-1 rounded-lg border border-terracota/20 text-terracota">Resis: {log.scores.endurance}</div>
                              <div className="bg-cyan-500/10 p-1 rounded-lg border border-cyan-500/20 text-cyan-300">Enfoq: {log.scores.mindfulness}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-6 text-xs text-white/40 italic bg-[#141416] rounded-2xl border border-white/10">No hay comentarios ni valoraciones previas.</p>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Formulario para añadir nueva valoración */}
                <div className="bg-[#141416] p-5 rounded-3xl border border-white/15 shadow-xl h-fit space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-terracota">Registrar Valoración</h4>
                    <p className="text-[11px] text-white/70 leading-relaxed mt-1">Evalúa el rendimiento físico e introspectivo de la práctica del alumno de 1 a 10.</p>
                  </div>

                  <form onSubmit={handleSaveProgressLog} className="space-y-4">
                    {[
                      { label: 'Flexibilidad', state: flexibility, set: setFlexibility, color: 'text-salvia' },
                      { label: 'Fuerza Física', state: strength, set: setStrength, color: 'text-amber-300' },
                      { label: 'Equilibrio / Postura', state: balance, set: setBalance, color: 'text-indigo-300' },
                      { label: 'Resistencia / Respiración', state: endurance, set: setEndurance, color: 'text-terracota' },
                      { label: 'Enfoque / Paz Mental', state: mindfulness, set: setMindfulness, color: 'text-cyan-300' },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between items-center font-bold text-xs uppercase tracking-wider text-white">
                          <span>{item.label}</span>
                          <span className={`${item.color} font-black font-serif text-sm bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/10`}>
                            {item.state} / 10
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={item.state}
                          onChange={(e) => item.set(Number(e.target.value))}
                          className="w-full accent-salvia cursor-pointer h-2 bg-black/60 rounded-lg border border-white/10 appearance-none"
                        />
                      </div>
                    ))}

                    <div className="space-y-1.5 pt-2">
                      <Label htmlFor="progressNotesInput" className="text-xs font-bold uppercase tracking-widest text-white/80">Instrucciones y Observaciones</Label>
                      <textarea
                        id="progressNotesInput"
                        rows={3}
                        placeholder="Escribe recomendaciones, posturas a practicar o felicitaciones..."
                        value={progressNotes}
                        onChange={(e) => setProgressNotes(e.target.value)}
                        className="flex w-full rounded-2xl border border-white/20 bg-[#18181b] px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-salvia focus:ring-1 focus:ring-salvia"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={savingProgress}
                      className="w-full rounded-full bg-salvia py-3.5 text-xs font-black uppercase tracking-widest text-black hover:bg-salvia/90 shadow-lg cursor-pointer transition-all"
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
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold uppercase tracking-wider">
                        <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                          <span className="text-white/80 text-[10px]">Flexibilidad</span>
                          <span className="text-salvia font-serif text-sm font-black bg-salvia/15 px-2 py-0.5 rounded-lg border border-salvia/30">
                            {progressLogs[progressLogs.length - 1].scores.flexibility} / 10
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                          <span className="text-white/80 text-[10px]">Fuerza Física</span>
                          <span className="text-amber-300 font-serif text-sm font-black bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                            {progressLogs[progressLogs.length - 1].scores.strength} / 10
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                          <span className="text-white/80 text-[10px]">Equilibrio</span>
                          <span className="text-indigo-300 font-serif text-sm font-black bg-indigo-500/15 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                            {progressLogs[progressLogs.length - 1].scores.balance} / 10
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm">
                          <span className="text-white/80 text-[10px]">Resistencia</span>
                          <span className="text-terracota font-serif text-sm font-black bg-terracota/15 px-2 py-0.5 rounded-lg border border-terracota/30">
                            {progressLogs[progressLogs.length - 1].scores.endurance} / 10
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-[#18181b] px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-sm col-span-2">
                          <span className="text-white/80 text-[10px]">Enfoque / Paz Mental</span>
                          <span className="text-cyan-300 font-serif text-sm font-black bg-cyan-500/15 px-2 py-0.5 rounded-lg border border-cyan-500/30">
                            {progressLogs[progressLogs.length - 1].scores.mindfulness} / 10
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-xs text-white/50 italic bg-[#141416] rounded-2xl border border-white/10">
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
                      <div key={log.id} className="bg-[#18181b] p-4 rounded-2xl border border-white/10 text-xs space-y-2.5 shadow-md">
                        <div className="flex justify-between items-center font-bold text-white">
                          <span>{format(new Date(log.date), 'dd/MM/yyyy')}</span>
                          <span className="text-[10px] font-semibold text-salvia bg-salvia/15 border border-salvia/30 px-2.5 py-0.5 rounded-full">
                            Prof: {log.instructorName}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-white/85 italic leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                            "{log.notes}"
                          </p>
                        )}
                        <div className="grid grid-cols-5 gap-1 text-[9px] font-bold text-white/70 text-center uppercase tracking-wider pt-2 border-t border-white/10">
                          <div className="bg-salvia/10 p-1 rounded-lg border border-salvia/20 text-salvia">Flex: {log.scores.flexibility}</div>
                          <div className="bg-amber-500/10 p-1 rounded-lg border border-amber-500/20 text-amber-300">Fuerza: {log.scores.strength}</div>
                          <div className="bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/20 text-indigo-300">Equil: {log.scores.balance}</div>
                          <div className="bg-terracota/10 p-1 rounded-lg border border-terracota/20 text-terracota">Resis: {log.scores.endurance}</div>
                          <div className="bg-cyan-500/10 p-1 rounded-lg border border-cyan-500/20 text-cyan-300">Enfoq: {log.scores.mindfulness}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 text-center text-xs text-white/50 italic bg-[#141416] rounded-2xl border border-white/10 leading-relaxed">
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
                {/* 1. GESTIÓN DE RETIROS */}
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
                   <Card className="rounded-[32px] border-[8px] border-[#1c1814] bg-[#1c1814] shadow-2xl overflow-hidden animate-fadeIn">
                     {/* Premium Dark Header */}
                     <div className="relative bg-[#1c1814] px-8 pt-8 pb-10 overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-[#2a2018]/80 to-[#1c1814]" />
                       <div className="absolute top-0 right-0 w-64 h-64 bg-salvia/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                       <div className="absolute bottom-0 left-0 w-40 h-40 bg-terracota/8 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                       <div className="relative z-10">
                         <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                           <div>
                             <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-salvia mb-1">Panel Empresarial</p>
                             <h2 className="font-serif text-3xl font-bold text-white">Métricas de Negocio</h2>
                             <p className="text-xs text-white/50 mt-1">Rendimiento comercial · Afluencia · Reservas</p>
                           </div>
                           <div className="text-right shrink-0">
                             <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Período activo</p>
                             <p className="text-sm font-bold text-white/80 font-serif">{new Date().toLocaleDateString('es', { month: 'long', year: 'numeric' })}</p>
                           </div>
                         </div>
                       </div>
                     </div>

                     <CardContent className="bg-[#1c1814] px-6 pb-8 -mt-4 space-y-6">
                       {/* KPI Cards Row */}
                       <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                         {/* Revenue KPI */}
                         <div className="relative overflow-hidden bg-[#2a2018] border border-salvia/30 rounded-[20px] p-5 group hover:border-salvia/60 hover:bg-[#312518] transition-all">
                           <div className="absolute top-3 right-3 w-8 h-8 bg-salvia/20 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 fill-current" style={{color:'#a8bc9f'}} viewBox="0 0 24 24">
                               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                             </svg>
                           </div>
                           <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Ingresos (últ. 30d)</p>
                           <p className="text-2xl font-serif font-bold text-white">${mrr.toFixed(2)}</p>
                           <p className="text-[9px] font-semibold mt-1.5" style={{color:'#a8bc9f'}}>Membresías activas</p>
                         </div>

                         {/* Active Members KPI */}
                         <div className="relative overflow-hidden bg-[#2a2018] border border-terracota/30 rounded-[20px] p-5 group hover:border-terracota/60 hover:bg-[#312518] transition-all">
                           <div className="absolute top-3 right-3 w-8 h-8 bg-terracota/20 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-terracota fill-current" viewBox="0 0 24 24">
                               <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                             </svg>
                           </div>
                           <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Miembros Activos</p>
                           <p className="text-2xl font-serif font-bold text-white">{activeStudentsCount}</p>
                           <p className="text-[9px] text-terracota font-semibold mt-1.5">de {totalStudentsCount} registrados</p>
                         </div>

                         {/* Occupancy KPI */}
                         <div className="relative overflow-hidden bg-[#2a2018] border border-white/15 rounded-[20px] p-5 group hover:border-white/30 hover:bg-[#312518] transition-all">
                           <div className="absolute top-3 right-3 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-white/70 fill-current" viewBox="0 0 24 24">
                               <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                             </svg>
                           </div>
                           <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Ocupación Promedio</p>
                           <p className="text-2xl font-serif font-bold text-white">{bookingRate}%</p>
                           <div className="mt-2 w-full bg-white/10 rounded-full h-1.5">
                             <div className="h-full rounded-full transition-all" style={{backgroundColor:'#a8bc9f', width: `${Math.min(parseFloat(String(bookingRate)), 100)}%`}} />
                           </div>
                         </div>

                         {/* New Students KPI */}
                         <div className="relative overflow-hidden bg-[#2a2018] border border-amber-500/30 rounded-[20px] p-5 group hover:border-amber-500/60 hover:bg-[#312518] transition-all">
                           <div className="absolute top-3 right-3 w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                             <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 24 24">
                               <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                             </svg>
                           </div>
                           <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Nuevos Alumnos (30d)</p>
                           <p className="text-2xl font-serif font-bold text-white">+{newStudentsLast30Days}</p>
                           <p className="text-[9px] text-amber-400 font-semibold mt-1.5">Incorporaciones recientes</p>
                         </div>
                       </div>

                       {/* Charts Row */}
                       <div className="grid gap-4 md:grid-cols-2">
                         {/* Revenue Chart */}
                         <div className="bg-[#241e19] border border-white/8 rounded-[20px] p-5">
                           <div className="flex items-center justify-between mb-4">
                             <div>
                               <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30 mb-0.5">Tendencia</p>
                               <h4 className="text-xs font-bold text-white/80">Ingresos Mensuales</h4>
                             </div>
                             <span className="text-[8px] font-bold uppercase tracking-wider bg-salvia/25 text-salvia px-2.5 py-1 rounded-full">6 Meses</span>
                           </div>
                           {allPaymentsLoading ? (
                             <div className="flex justify-center items-center h-32">
                               <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                             </div>
                           ) : revenueData.some(d => d.value > 0) ? (
                             <svg viewBox="0 0 340 130" className="w-full h-auto overflow-visible">
                               <defs>
                                 <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                   <stop offset="0%" stopColor="var(--color-salvia, #8b9c86)" stopOpacity="0.25"/>
                                   <stop offset="100%" stopColor="var(--color-salvia, #8b9c86)" stopOpacity="0"/>
                                 </linearGradient>
                               </defs>
                               {/* Y-axis labels + grid */}
                               {[0, 0.5, 1].map((ratio) => {
                                 const maxVal = Math.max(...revenueData.map(d => d.value), 100);
                                 const val = Math.round(maxVal * ratio);
                                 const y = 10 + (1 - ratio) * 90;
                                 return (
                                   <g key={ratio}>
                                     <line x1={30} y1={y} x2={330} y2={y} stroke="#ffffff" strokeWidth="0.4" strokeDasharray="3,3" opacity="0.12"/>
                                     <text x={0} y={y + 3} fill="rgba(255,255,255,0.35)" fontSize="5.5">${val}</text>
                                   </g>
                                 );
                               })}
                               {/* Area fill + line */}
                               {(() => {
                                 const maxVal = Math.max(...revenueData.map(d => d.value), 100);
                                 const pts = revenueData.map((d, i) => ({
                                   x: 35 + (i / (revenueData.length - 1)) * 285,
                                   y: 10 + 90 - (d.value / maxVal) * 90
                                 }));
                                 const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                                 const areaD = `${lineD} L ${pts[pts.length-1].x} 100 L ${pts[0].x} 100 Z`;
                                 return (
                                   <>
                                     <path d={areaD} fill="url(#revenueGrad)" />
                                     <path d={lineD} fill="none" stroke="#a8bc9f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                     {pts.map((p, i) => (
                                       <g key={i}>
                                         <circle cx={p.x} cy={p.y} r="4" fill="#1c1814" stroke="#a8bc9f" strokeWidth="2"/>
                                         <text x={p.x} y={115} textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.4)">{revenueData[i].label}</text>
                                       </g>
                                     ))}
                                   </>
                                 );
                               })()}
                             </svg>
                           ) : (
                             <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
                               <svg className="w-8 h-8 fill-current" style={{color:'rgba(255,255,255,0.15)'}} viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
                               <p className="text-[10px] italic" style={{color:'rgba(255,255,255,0.3)'}}>Sin registros de pago en los últimos 6 meses</p>
                             </div>
                           )}
                         </div>

                         {/* Top Classes Chart */}
                         <div className="bg-[#241e19] border border-white/8 rounded-[20px] p-5">
                           <div className="flex items-center justify-between mb-4">
                             <div>
                               <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30 mb-0.5">Popularidad</p>
                               <h4 className="text-xs font-bold text-white/80">Clases Más Reservadas</h4>
                             </div>
                             <span className="text-[8px] font-bold uppercase tracking-wider bg-terracota/30 text-terracota px-2.5 py-1 rounded-full">Top 5</span>
                           </div>
                           {classPopularity.length > 0 ? (
                             <div className="space-y-3">
                               {classPopularity.map((d, idx) => {
                                 const maxVal = Math.max(...classPopularity.map(c => c.value), 1);
                                 const pct = (d.value / maxVal) * 100;
                                 const barColors = ['#a8bc9f', '#c08575', '#7a7060', '#d4a842', '#6e8b6a'];
                                 return (
                                   <div key={idx} className="space-y-1">
                                     <div className="flex justify-between items-center">
                                       <span className="text-[10px] font-semibold text-white/80 truncate max-w-[150px]">{d.label}</span>
                                       <span className="text-[10px] font-bold text-white/40">{d.value} reservas</span>
                                     </div>
                                     <div className="w-full h-2 bg-white/8 rounded-full overflow-hidden">
                                       <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColors[idx % barColors.length] }} />
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           ) : (
                             <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
                               <svg className="w-8 h-8 fill-current" style={{color:'rgba(255,255,255,0.15)'}} viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                               <p className="text-[10px] italic" style={{color:'rgba(255,255,255,0.3)'}}>Aún no hay reservas registradas</p>
                             </div>
                           )}
                         </div>
                       </div>

                       {/* Bottom Row: Peak Hours + Summary */}
                       <div className="grid gap-4 md:grid-cols-2">
                         {/* Peak Hours */}
                         <div className="bg-[#241e19] border border-white/8 rounded-[20px] p-5">
                           <div className="flex items-center gap-2 mb-4">
                             <div className="w-7 h-7 rounded-full bg-salvia/20 flex items-center justify-center">
                               <svg className="w-3.5 h-3.5 fill-current" style={{color:'#a8bc9f'}} viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                             </div>
                             <div>
                               <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/30">Afluencia</p>
                               <h4 className="text-xs font-bold text-white/80">Horas Pico</h4>
                             </div>
                           </div>
                           {popularHours.length > 0 ? (
                             <div className="space-y-2.5">
                               {popularHours.map((h, idx) => {
                                 const max = Math.max(...popularHours.map(x => x.value), 1);
                                 const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`;
                                 return (
                                   <div key={idx} className="flex items-center gap-3">
                                     <span className="text-sm shrink-0">{rank}</span>
                                     <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-center mb-1">
                                         <span className="text-[10px] font-bold text-white/80">{h.label} hs</span>
                                         <span className="text-[9px] text-white/40">{h.value} reservas</span>
                                       </div>
                                       <div className="w-full h-1.5 bg-white/8 rounded-full">
                                         <div className="h-full rounded-full" style={{backgroundColor:'#a8bc9f', width: `${(h.value/max)*100}%`}} />
                                       </div>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           ) : (
                             <p className="text-center text-[10px] italic py-6" style={{color:'rgba(255,255,255,0.3)'}}>No hay clases con reservas registradas</p>
                           )}
                         </div>

                         {/* Summary */}
                         <div className="relative overflow-hidden bg-gradient-to-br from-[#1c1814] to-[#2a2018] rounded-[20px] p-6 flex flex-col justify-between">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-salvia/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                           <div className="relative z-10">
                             <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-salvia/60 mb-2">Resumen Ejecutivo</p>
                             <h4 className="font-serif text-lg font-bold text-white mb-3">Estado del Estudio</h4>
                             <div className="space-y-3">
                               <div className="flex justify-between items-center text-xs border-b border-white/10 pb-2">
                                 <span className="text-white/50">Tasa de ocupación</span>
                                 <span className="font-bold text-salvia">{bookingRate}%</span>
                               </div>
                               <div className="flex justify-between items-center text-xs border-b border-white/10 pb-2">
                                 <span className="text-white/50">Total histórico</span>
                                 <span className="font-bold text-white">${allPayments.reduce((s, p) => s + (p.amount || 0), 0).toFixed(2)} USD</span>
                               </div>
                               <div className="flex justify-between items-center text-xs">
                                 <span className="text-white/50">Miembros activos</span>
                             <span className="font-bold text-amber-400">{activeStudentsCount} / {totalStudentsCount}</span>
                               </div>
                             </div>
                           </div>
                           <div className="relative z-10 mt-4 pt-3 border-t border-white/10">
                             <p className="text-[9px] text-white/30 leading-relaxed">
                               Panel Enterprise · Datos en tiempo real desde Firestore
                             </p>
                           </div>
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
