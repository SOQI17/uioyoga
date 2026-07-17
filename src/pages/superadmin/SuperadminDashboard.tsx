import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, getDoc, addDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  CreditCard, 
  Building, 
  ExternalLink,
  Settings,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Check,
  X,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface StudioInfo {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  subscriptionPlan: string;
  subscriptionExpiry?: string;
  trialEndsAt?: string;
  ownerId?: string;
  ownerEmail?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  useWoodTexture?: boolean;
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  tenantId?: string;
}

const COLOR_PRESETS = [
  {
    name: 'Madera Oscura (Default)',
    primaryColor: '#9ca688',
    secondaryColor: '#2e1d15',
    accentColor: '#c9856d',
    backgroundColor: '#09090a',
    textColor: '#fafaf9',
    useWoodTexture: true
  },
  {
    name: 'Arena Fina (Claro)',
    primaryColor: '#8a6240',
    secondaryColor: '#f4ede4',
    accentColor: '#c97d60',
    backgroundColor: '#faf8f5',
    textColor: '#1c1917',
    useWoodTexture: false
  },
  {
    name: 'Midnight Blue (Oscuro)',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e293b',
    accentColor: '#ec4899',
    backgroundColor: '#0f172a',
    textColor: '#f8fafc',
    useWoodTexture: false
  },
  {
    name: 'Forest Zen',
    primaryColor: '#2e7d32',
    secondaryColor: '#1b3a24',
    accentColor: '#fbc02d',
    backgroundColor: '#0c1910',
    textColor: '#f1f8e9',
    useWoodTexture: false
  },
  {
    name: 'Terracota Cálido',
    primaryColor: '#c2410c',
    secondaryColor: '#fdf6e2',
    accentColor: '#ea580c',
    backgroundColor: '#faf6eb',
    textColor: '#292524',
    useWoodTexture: false
  }
];

export function SuperadminDashboard() {
  const [studios, setStudios] = useState<StudioInfo[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [studioFilter, setStudioFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudio, setEditingStudio] = useState<StudioInfo | null>(null);
  
  // Form fields
  const [studioId, setStudioId] = useState('');
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended' | 'trial'>('trial');
  const [subscriptionPlan, setSubscriptionPlan] = useState('basic');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#9ca688');
  const [secondaryColor, setSecondaryColor] = useState('#2e1d15');
  const [accentColor, setAccentColor] = useState('#c9856d');
  const [backgroundColor, setBackgroundColor] = useState('#09090a');
  const [textColor, setTextColor] = useState('#fafaf9');
  const [useWoodTexture, setUseWoodTexture] = useState(true);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  // SaaS Tab Selection
  const [superadminTab, setSuperadminTab] = useState<'studios' | 'subscriptions' | 'billing_config'>('studios');

  // Global Billing Configuration States
  const [bankName, setBankName] = useState('Banco Pichincha');
  const [bankAccountHolder, setBankAccountHolder] = useState('UIO YOGA S.A.S');
  const [bankAccountNumber, setBankAccountAccountNumber] = useState('2206789456');
  const [bankAccountType, setBankAccountType] = useState('Corriente');
  const [bankTaxId, setBankTaxId] = useState('1793456789001');
  const [priceBasic, setPriceBasic] = useState('30.00');
  const [pricePremium, setPricePremium] = useState('60.00');
  const [priceEnterprise, setPriceEnterprise] = useState('120.00');
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');
  const [configError, setConfigError] = useState('');

  // Manual Activation and Rejection States
  const [selectedStudioForManage, setSelectedStudioForManage] = useState<StudioInfo | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageHistory, setManageHistory] = useState<any[]>([]);
  const [manageHistoryLoading, setManageHistoryLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null); // payment ID

  // Editable Plan details inside management modal
  const [editPlan, setEditPlan] = useState('basic');
  const [editExpiry, setEditExpiry] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended' | 'trial'>('active');
  const [isUpdatingStudioDetails, setIsUpdatingStudioDetails] = useState(false);

  const handleUpdateStudioDetails = async () => {
    if (!selectedStudioForManage) return;
    setIsUpdatingStudioDetails(true);
    try {
      const studioRef = doc(db, 'studios', selectedStudioForManage.id);
      const updateData: any = {
        subscriptionPlan: editPlan,
        status: editStatus,
        subscriptionExpiry: editExpiry || null
      };
      await updateDoc(studioRef, updateData);
      
      alert('Detalles de suscripción actualizados con éxito.');
      await fetchStudios();
      
      // Update modal local state
      setSelectedStudioForManage(prev => {
        if (!prev) return null;
        return {
          ...prev,
          subscriptionPlan: editPlan,
          status: editStatus,
          subscriptionExpiry: editExpiry
        };
      });
    } catch (err: any) {
      console.error("Error updating studio details:", err);
      alert("Error al actualizar: " + err.message);
    } finally {
      setIsUpdatingStudioDetails(false);
    }
  };

  const fetchBillingConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'platform_billing');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBankName(data.bankName || 'Banco Pichincha');
        setBankAccountHolder(data.bankAccountHolder || 'UIO YOGA S.A.S');
        setBankAccountAccountNumber(data.bankAccountNumber || '2206789456');
        setBankAccountType(data.bankAccountType || 'Corriente');
        setBankTaxId(data.bankTaxId || '1793456789001');
        setPriceBasic(data.priceBasic?.toString() || '30.00');
        setPricePremium(data.pricePremium?.toString() || '60.00');
        setPriceEnterprise(data.priceEnterprise?.toString() || '120.00');
      }
    } catch (err) {
      console.error("Error fetching platform billing configuration:", err);
    }
  };

  const handleSaveBillingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigSuccess('');
    setConfigError('');
    try {
      const docRef = doc(db, 'settings', 'platform_billing');
      await setDoc(docRef, {
        bankName,
        bankAccountHolder,
        bankAccountNumber,
        bankAccountType,
        bankTaxId,
        priceBasic: parseFloat(priceBasic),
        pricePremium: parseFloat(pricePremium),
        priceEnterprise: parseFloat(priceEnterprise),
        updatedAt: new Date().toISOString()
      });
      setConfigSuccess('Ajustes de facturación guardados con éxito.');
    } catch (err: any) {
      console.error("Error saving platform billing configuration:", err);
      setConfigError(err.message || 'Error al guardar los ajustes.');
    } finally {
      setConfigSaving(false);
    }
  };

  const fetchPaymentsHistory = async (studioId: string) => {
    setManageHistoryLoading(true);
    try {
      const q = query(
        collection(db, 'payments'),
        where('studioId', '==', studioId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManageHistory(history);
    } catch (err) {
      console.error("Error fetching studio payment history:", err);
    } finally {
      setManageHistoryLoading(false);
    }
  };

  const handleOpenManageModal = async (studio: StudioInfo) => {
    setSelectedStudioForManage(studio);
    setIsManageModalOpen(true);
    setRejectionReason('');
    setShowRejectInput(null);
    setActionNotes('');
    
    setEditPlan(studio.subscriptionPlan || 'basic');
    setEditExpiry(studio.subscriptionExpiry ? studio.subscriptionExpiry.slice(0, 10) : '');
    setEditStatus(studio.status || 'active');

    await fetchPaymentsHistory(studio.id);
  };

  const handleActivateSubscription = async (paymentToApprove?: any) => {
    if (!selectedStudioForManage) return;
    setActionLoading(true);
    try {
      let currentExpiry = selectedStudioForManage.subscriptionExpiry 
        ? new Date(selectedStudioForManage.subscriptionExpiry) 
        : null;
      
      let baseDate = new Date();
      if (currentExpiry && currentExpiry > new Date()) {
        baseDate = currentExpiry;
      }
      
      const newExpiryDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const studioRef = doc(db, 'studios', selectedStudioForManage.id);
      await updateDoc(studioRef, {
        status: 'active',
        subscriptionExpiry: newExpiryDate
      });

      if (paymentToApprove) {
        const paymentRef = doc(db, 'payments', paymentToApprove.id);
        await updateDoc(paymentRef, {
          status: 'approved',
          processedAt: new Date().toISOString(),
          processedBy: user?.email || 'superadmin',
          activationNotes: actionNotes || 'Activación manual por el administrador'
        });
      } else {
        await addDoc(collection(db, 'payments'), {
          studioId: selectedStudioForManage.id,
          subdomain: selectedStudioForManage.subdomain,
          subscriptionPlan: selectedStudioForManage.subscriptionPlan || 'basic',
          amount: 0.00,
          transferDate: new Date().toISOString().split('T')[0],
          referenceNumber: 'MANUAL-ACTIVATE',
          remarks: actionNotes || 'Activado directamente por el superadministrador',
          status: 'approved',
          receiptUploaded: false,
          createdAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          processedBy: user?.email || 'superadmin',
          activationNotes: actionNotes || 'Activación manual'
        });
      }

      alert('¡Suscripción activada/renovada con éxito!');
      setActionNotes('');
      
      await fetchStudios();
      await fetchPaymentsHistory(selectedStudioForManage.id);
      
      setSelectedStudioForManage(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'active',
          subscriptionExpiry: newExpiryDate
        };
      });
    } catch (err: any) {
      console.error("Error activating subscription:", err);
      alert('Error al activar la suscripción: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (payment: any) => {
    if (!rejectionReason.trim()) {
      alert('Por favor ingresa un motivo para el rechazo.');
      return;
    }
    setActionLoading(true);
    try {
      const paymentRef = doc(db, 'payments', payment.id);
      await updateDoc(paymentRef, {
        status: 'rejected',
        processedAt: new Date().toISOString(),
        processedBy: user?.email || 'superadmin',
        rejectedReason: rejectionReason
      });

      alert('Pago rechazado con éxito.');
      setRejectionReason('');
      setShowRejectInput(null);
      
      if (selectedStudioForManage) {
        await fetchPaymentsHistory(selectedStudioForManage.id);
      }
    } catch (err: any) {
      console.error("Error rejecting payment:", err);
      alert('Error al rechazar el pago: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchStudios = async () => {
    try {
      const snap = await getDocs(collection(db, 'studios'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudioInfo));
      setStudios(list);
    } catch (err) {
      console.error("Error fetching studios:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(list);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const handleUpdateUser = async (uid: string, updatedFields: Partial<UserProfile>) => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, updatedFields);
      alert('Usuario actualizado con éxito.');
      await fetchUsers();
    } catch (err: any) {
      console.error("Error updating user:", err);
      alert('Error al actualizar usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario de la base de datos?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', uid));
      alert('Usuario eliminado con éxito.');
      await fetchUsers();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert('Error al eliminar usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchStudios(), fetchUsers(), fetchBillingConfig()]);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingStudio(null);
    setStudioId('');
    setName('');
    setSubdomain('');
    setStatus('trial');
    setSubscriptionPlan('basic');
    
    // Set default trial date to +14 days
    const trialDate = new Date();
    trialDate.setDate(trialDate.getDate() + 14);
    setTrialEndsAt(trialDate.toISOString().slice(0, 10));

    // Set default expiry to +30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    setSubscriptionExpiry(expiryDate.toISOString().slice(0, 10));

    setOwnerId('');
    setOwnerEmail('');
    setPrimaryColor('#9ca688');
    setSecondaryColor('#2e1d15');
    setAccentColor('#c9856d');
    setBackgroundColor('#09090a');
    setTextColor('#fafaf9');
    setUseWoodTexture(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (studio: StudioInfo) => {
    setEditingStudio(studio);
    setStudioId(studio.id);
    setName(studio.name);
    setSubdomain(studio.subdomain);
    setStatus(studio.status);
    setSubscriptionPlan(studio.subscriptionPlan);
    setSubscriptionExpiry(studio.subscriptionExpiry ? studio.subscriptionExpiry.slice(0, 10) : '');
    setTrialEndsAt(studio.trialEndsAt ? studio.trialEndsAt.slice(0, 10) : '');
    setOwnerId(studio.ownerId || '');
    setOwnerEmail(studio.ownerEmail || '');
    setPrimaryColor(studio.primaryColor || '#9ca688');
    setSecondaryColor(studio.secondaryColor || '#2e1d15');
    setAccentColor(studio.accentColor || '#c9856d');
    setBackgroundColor(studio.backgroundColor || '#09090a');
    setTextColor(studio.textColor || '#fafaf9');
    setUseWoodTexture(studio.useWoodTexture !== false);
    setModalOpen(true);
  };

  const handleSaveStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const docId = studioId.trim().toLowerCase();
    
    const studioData = {
      name,
      subdomain: subdomain.trim().toLowerCase(),
      status,
      subscriptionPlan,
      subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry).toISOString() : '',
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : '',
      ownerId: ownerId.trim(),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      useWoodTexture,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingStudio) {
        // Update studio document
        await updateDoc(doc(db, 'studios', editingStudio.id), studioData);
      } else {
        // Create new studio document
        await setDoc(doc(db, 'studios', docId), {
          ...studioData,
          createdAt: new Date().toISOString()
        });

        // Initialize default homepage settings for this studio to prevent landing page rendering crashes
        const settingsDocId = subdomain.replace('.uioyoga.com', '').trim().toLowerCase();
        await setDoc(doc(db, 'settings', settingsDocId), {
          heroTitle: `Santuario de Yoga ${name}`,
          heroSubtitle: `Una experiencia de bienestar integral diseñada para elevar tu energía en la comunidad ${name}.`,
          philosophyTitle: 'Nuestra Filosofía',
          philosophyText: `En ${name}, creemos en la armonía entre cuerpo y mente.`,
          splashTitle: name.toUpperCase(),
          splashSubtitle: 'Vive la experiencia',
          createdAt: new Date().toISOString()
        });
      }

      // If an ownerEmail was assigned, update the owner's user document role and studioId in Firestore
      if (ownerEmail.trim()) {
        const lowercaseEmail = ownerEmail.trim().toLowerCase();
        try {
          const userQuery = query(collection(db, 'users'), where('email', '==', lowercaseEmail));
          const userSnap = await getDocs(userQuery);
          if (!userSnap.empty) {
            const userDocRef = doc(db, 'users', userSnap.docs[0].id);
            const userData = userSnap.docs[0].data();
            const isSuperAdmin = userData.role === 'superadmin' || lowercaseEmail === 'suqisam@gmail.com';
            
            await updateDoc(userDocRef, {
              role: isSuperAdmin ? 'superadmin' : 'admin',
              tenantId: subdomain.trim().toLowerCase()
            });
          }
        } catch (err) {
          console.warn("Could not auto-link owner role by email:", err);
        }
      }

      alert('Estudio guardado correctamente.');
      setModalOpen(false);
      await Promise.all([fetchStudios(), fetchUsers()]);
    } catch (err: any) {
      console.error("Error saving studio:", err);
      alert('Error al guardar el estudio: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudio = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este estudio? Se perderán las configuraciones de este tenant.")) return;
    setLoading(true);
    try {
      const studio = studios.find(s => s.id === id);
      const cleanSub = studio?.subdomain ? studio.subdomain.replace('.uioyoga.com', '').trim().toLowerCase() : id;
      await deleteDoc(doc(db, 'studios', id));
      await deleteDoc(doc(db, 'settings', cleanSub));
      alert('Estudio eliminado.');
      await fetchStudios();
    } catch (err: any) {
      console.error("Error deleting studio:", err);
      alert('Error al eliminar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  // Stats calculation
  const totalStudios = studios.length;
  const activeStudios = studios.filter(s => s.status === 'active').length;
  const trialStudios = studios.filter(s => s.status === 'trial').length;
  const suspendedStudios = studios.filter(s => s.status === 'suspended').length;

  if (loading && studios.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-marfil">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-salvia"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-marfil py-16">
      <div className="container mx-auto px-4 md:px-12">
        
        {/* Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="mb-2 block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota">
              Consola del SaaS Portal
            </span>
            <h1 className="mb-2 font-serif text-5xl font-medium text-gris">
              Superadministración
            </h1>
            <p className="text-lg text-gris/70">Panel global de control de inquilinos y suscripciones.</p>
          </div>
          <div className="flex gap-4">
            <Button onClick={handleOpenCreate} className="rounded-full bg-salvia px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md">
              <Plus className="mr-2 h-4 w-4 inline" /> Crear Estudio
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="rounded-full border border-arena px-6 py-2 text-xs font-bold uppercase tracking-widest text-gris hover:bg-arena">
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-3 pb-6 overflow-x-auto select-none no-scrollbar border-b border-arena/30 mb-8 text-xs font-bold uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setSuperadminTab('studios')}
            className={`rounded-full px-6 py-3 transition-all shrink-0 cursor-pointer ${
              superadminTab === 'studios' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
            }`}
          >
            Estudios & Roles
          </button>
          <button
            type="button"
            onClick={() => setSuperadminTab('subscriptions')}
            className={`rounded-full px-6 py-3 transition-all shrink-0 cursor-pointer ${
              superadminTab === 'subscriptions' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
            }`}
          >
            Suscripciones & Pagos
          </button>
          <button
            type="button"
            onClick={() => setSuperadminTab('billing_config')}
            className={`rounded-full px-6 py-3 transition-all shrink-0 cursor-pointer ${
              superadminTab === 'billing_config' ? 'bg-salvia text-white shadow-md' : 'bg-arena/40 text-gris/70 hover:bg-arena'
            }`}
          >
            Ajustes de Facturación
          </button>
        </div>

        {superadminTab === 'studios' && (
          <>
            {/* Stats Section */}
        <div className="grid gap-6 md:grid-cols-4 mb-12">
          <Card className="rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-6">
            <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-lg text-salvia">Total Estudios</CardTitle>
              <Building className="h-5 w-5 text-salvia" />
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-4xl font-light text-gris">{totalStudios}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-6">
            <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-lg text-green-400">Estudios Activos</CardTitle>
              <ShieldCheck className="h-5 w-5 text-green-400" />
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-4xl font-light text-gris">{activeStudios}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-6">
            <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-lg text-terracota">En Prueba (Trial)</CardTitle>
              <Users className="h-5 w-5 text-terracota" />
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-4xl font-light text-gris">{trialStudios}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-6">
            <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-lg text-red-400">Suspendidos</CardTitle>
              <CreditCard className="h-5 w-5 text-red-400" />
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-4xl font-light text-gris">{suspendedStudios}</p>
            </CardContent>
          </Card>
        </div>

        {/* Studios Table */}
        <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden mb-12">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="font-serif text-2xl text-gris">Estudios Registrados</CardTitle>
            <p className="text-xs text-gris/60">Gestiona accesos, suscripciones y dueños de cada plataforma.</p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-arena/30 text-gris/60 border-b border-arena/20 font-bold uppercase tracking-wider">
                    <th className="p-4">Estudio</th>
                    <th className="p-4">Subdominio</th>
                    <th className="p-4">Plan</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Vencimiento</th>
                    <th className="p-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena/10">
                  {studios.map(studio => (
                    <tr key={studio.id} className="text-gris/85 hover:bg-arena/5 transition-colors">
                      <td className="p-4 font-semibold">{studio.name}</td>
                      <td className="p-4 text-xs font-mono">{studio.subdomain}.uioyoga.com</td>
                      <td className="p-4 capitalize">{studio.subscriptionPlan}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                          studio.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : studio.status === 'trial'
                              ? 'bg-terracota/20 text-terracota'
                              : 'bg-red-500/20 text-red-400'
                        }`}>
                          {studio.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        {studio.status === 'trial' 
                          ? `Prueba: ${studio.trialEndsAt ? new Date(studio.trialEndsAt).toLocaleDateString() : 'N/A'}` 
                          : studio.subscriptionExpiry ? new Date(studio.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 flex gap-2">
                        <a href={`/dashboard?tenant=${studio.subdomain}`} target="_blank" rel="noreferrer" title="Visitar panel del estudio">
                          <Button variant="outline" className="p-2 border border-salvia/30 hover:bg-salvia/10 text-salvia rounded-xl">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                        <Button
                          variant="outline"
                          onClick={() => setStudioFilter(studioFilter === studio.id ? null : studio.id)}
                          className={`p-2 border rounded-xl transition-all ${
                            studioFilter === studio.id 
                              ? 'bg-salvia text-white border-salvia' 
                              : 'border-salvia/30 hover:bg-salvia/10 text-salvia'
                          }`}
                          title="Filtrar usuarios de este estudio"
                        >
                          <Users className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" onClick={() => handleOpenEdit(studio)} className="p-2 border border-arena hover:bg-arena text-gris rounded-xl" title="Editar estudio">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" onClick={() => handleDeleteStudio(studio.id)} className="p-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl" title="Eliminar estudio">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* User Management Table */}
        <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden mb-12">
          <CardHeader className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-serif text-2xl text-gris flex flex-wrap items-center gap-2">
                <span>Usuarios Registrados (Gestión de Roles)</span>
                {studioFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-salvia/20 px-2.5 py-0.5 text-xs font-bold text-salvia">
                    Filtrado por: {studios.find(s => s.id === studioFilter)?.name || studioFilter}
                    <button onClick={() => setStudioFilter(null)} className="hover:text-red-400 font-bold ml-1 cursor-pointer">×</button>
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-gris/60">Gestiona roles de usuarios y sus accesos a cada estudio en tiempo real.</p>
            </div>
            {/* Search Input */}
            <div className="w-full md:w-72">
              <Input
                type="text"
                placeholder="Buscar usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-2xl border-none bg-arena/5 px-4 py-2 text-xs shadow-inner text-gris"
              />
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-arena/30 text-gris/60 border-b border-arena/20 font-bold uppercase tracking-wider">
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Rol Asignado</th>
                    <th className="p-4">Estudio Asignado</th>
                    <th className="p-4" style={{ width: '100px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-arena/10">
                  {users
                    .filter(u => {
                      const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesStudio = studioFilter ? u.tenantId === studioFilter : true;
                      return matchesSearch && matchesStudio;
                    })
                    .map(u => (
                      <tr key={u.uid} className="text-gris/85 hover:bg-arena/5 transition-colors">
                        <td className="p-4 font-semibold">{u.name}</td>
                        <td className="p-4 text-xs font-mono">{u.email}</td>
                        <td className="p-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUser(u.uid, { role: e.target.value as any })}
                            className="bg-arena/40 text-gris rounded-xl px-3 py-1.5 text-xs border border-arena/30 focus:outline-none cursor-pointer focus:ring-1 focus:ring-salvia"
                          >
                            <option value="student">Alumno (Student)</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Administrador (Admin)</option>
                            <option value="superadmin">Superadministrador (S.Admin)</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <select
                            value={u.tenantId || ''}
                            onChange={(e) => handleUpdateUser(u.uid, { tenantId: e.target.value || null as any })}
                            className="bg-arena/40 text-gris rounded-xl px-3 py-1.5 text-xs border border-arena/30 focus:outline-none cursor-pointer focus:ring-1 focus:ring-salvia w-full max-w-[200px]"
                          >
                            <option value="">-- Ninguno / Base SaaS --</option>
                            {studios.map(s => (
                              <option key={s.id} value={s.subdomain}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <Button
                            variant="outline"
                            onClick={() => handleDeleteUser(u.uid)}
                            className="p-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {/* TAB 2: SUSCRIPCIONES */}
        {superadminTab === 'subscriptions' && (
          <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden mb-12 animate-fadeIn">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="font-serif text-2xl text-gris">Gestión de Suscripciones SaaS</CardTitle>
              <p className="text-xs text-gris/60">Activa suscripciones de forma manual, revisa transferencias bancarias y aprueba/rechaza comprobantes.</p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-arena/30 text-gris/60 border-b border-arena/20 font-bold uppercase tracking-wider">
                      <th className="p-4">Estudio</th>
                      <th className="p-4">Plan Actual</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Vencimiento</th>
                      <th className="p-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-arena/10">
                    {studios.map(studio => (
                      <tr key={studio.id} className="text-gris/85 hover:bg-arena/5 transition-colors">
                        <td className="p-4 font-semibold">
                          <p>{studio.name}</p>
                          <p className="text-[10px] text-gris/50 font-normal font-mono">{studio.subdomain}.uioyoga.com</p>
                        </td>
                        <td className="p-4 capitalize font-medium">{studio.subscriptionPlan || 'Básico'}</td>
                        <td className="p-4">
                          <span className={`text-[9px] font-bold uppercase px-3 py-1 rounded-full ${
                            studio.status === 'active' 
                              ? 'bg-green-500/20 text-green-600' 
                              : studio.status === 'trial'
                                ? 'bg-terracota/20 text-terracota'
                                : 'bg-red-500/20 text-red-600'
                          }`}>
                            {studio.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          {studio.status === 'trial' 
                            ? `Prueba: ${studio.trialEndsAt ? new Date(studio.trialEndsAt).toLocaleDateString() : 'N/A'}` 
                            : studio.subscriptionExpiry ? new Date(studio.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            variant="outline"
                            onClick={() => handleOpenManageModal(studio)}
                            className="rounded-full border border-salvia text-[10px] font-bold uppercase tracking-widest text-salvia hover:bg-salvia/10 px-5 py-2 cursor-pointer"
                          >
                            Gestionar Suscripción
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: CONFIGURACIÓN DE FACTURACIÓN */}
        {superadminTab === 'billing_config' && (
          <Card className="rounded-[32px] border-[8px] border-white bg-white shadow-xl overflow-hidden mb-12 animate-fadeIn">
            <CardHeader className="px-8 pt-8 pb-4 border-b border-arena/20">
              <CardTitle className="font-serif text-2xl text-gris">Configuración Global de Facturación</CardTitle>
              <p className="text-xs text-gris/60">Edita los detalles de la transferencia bancaria para los estudios y define los precios de cada plan de suscripción.</p>
            </CardHeader>
            <CardContent className="px-8 py-8">
              <form onSubmit={handleSaveBillingConfig} className="max-w-2xl space-y-6">
                {configSuccess && (
                  <div className="p-3.5 bg-green-500/10 text-green-600 text-xs rounded-xl flex items-center gap-2 border border-green-500/20">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{configSuccess}</span>
                  </div>
                )}
                {configError && (
                  <div className="p-3.5 bg-red-500/10 text-red-500 text-xs rounded-xl flex items-center gap-2 border border-red-500/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{configError}</span>
                  </div>
                )}

                {/* Datos bancarios */}
                <div className="space-y-4">
                  <h4 className="font-serif text-lg text-salvia font-semibold border-b border-arena/20 pb-1.5 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Datos Bancarios para Transferencias
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="bankName" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Nombre del Banco</Label>
                      <Input
                        id="bankName"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bankAccountHolder" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Titular de la Cuenta</Label>
                      <Input
                        id="bankAccountHolder"
                        required
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bankAccountNumber" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Número de Cuenta</Label>
                      <Input
                        id="bankAccountNumber"
                        required
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountAccountNumber(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bankAccountType" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Tipo de Cuenta</Label>
                      <Input
                        id="bankAccountType"
                        required
                        value={bankAccountType}
                        onChange={(e) => setBankAccountType(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="bankTaxId" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Identificación / RUC para el comprobante</Label>
                      <Input
                        id="bankTaxId"
                        required
                        value={bankTaxId}
                        onChange={(e) => setBankTaxId(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                {/* Precios de planes */}
                <div className="space-y-4 pt-4">
                  <h4 className="font-serif text-lg text-salvia font-semibold border-b border-arena/20 pb-1.5 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Tarifas de Planes SaaS ($ USD / mes)
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="priceBasic" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Precio Plan Básico ($)</Label>
                      <Input
                        id="priceBasic"
                        type="number"
                        step="0.01"
                        required
                        value={priceBasic}
                        onChange={(e) => setPriceBasic(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pricePremium" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Precio Plan Premium ($)</Label>
                      <Input
                        id="pricePremium"
                        type="number"
                        step="0.01"
                        required
                        value={pricePremium}
                        onChange={(e) => setPricePremium(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="priceEnterprise" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Precio Plan Enterprise ($)</Label>
                      <Input
                        id="priceEnterprise"
                        type="number"
                        step="0.01"
                        required
                        value={priceEnterprise}
                        onChange={(e) => setPriceEnterprise(e.target.value)}
                        className="rounded-2xl border-none bg-arena/35 shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={configSaving}
                    className="rounded-full bg-salvia px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md cursor-pointer"
                  >
                    {configSaving ? 'Guardando Ajustes...' : 'Guardar Configuración'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}


        {/* Modal Form */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 relative max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <h3 className="font-serif text-3xl text-gris mb-6">
                {editingStudio ? 'Editar Estudio' : 'Crear Nuevo Estudio'}
              </h3>
              
              <form onSubmit={handleSaveStudio} className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="id" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">ID de Estudio (Slug / Unico)</Label>
                    <Input
                      id="id"
                      required
                      disabled={!!editingStudio}
                      value={studioId}
                      onChange={(e) => setStudioId(e.target.value)}
                      placeholder="ej: kukutyoga"
                      className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Nombre Comercial</Label>
                    <Input
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ej: Kukut Yoga Studio"
                      className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="subdomain" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Subdominio de Vercel</Label>
                    <Input
                      id="subdomain"
                      required
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value)}
                      placeholder="ej: kukut"
                      className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="plan" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Plan Tarifario</Label>
                    <select
                      id="plan"
                      value={subscriptionPlan}
                      onChange={(e) => setSubscriptionPlan(e.target.value)}
                      className="flex h-10 w-full rounded-2xl border-none bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                    >
                      <option value="basic">Básico</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="status" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Estado Operativo</Label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="flex h-10 w-full rounded-2xl border-none bg-white px-4 py-2 text-sm shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                    >
                      <option value="trial">Prueba (Trial)</option>
                      <option value="active">Activo</option>
                      <option value="suspended">Suspendido / Bloqueado</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ownerEmail" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Email del Administrador (Dueño)</Label>
                    <Input
                      id="ownerEmail"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="ej: admin@estudio.com"
                      className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="trialExp" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Fin del Trial</Label>
                    <Input
                      id="trialExp"
                      type="date"
                      value={trialEndsAt}
                      onChange={(e) => setTrialEndsAt(e.target.value)}
                      className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expiry" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Fin de Suscripción</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={subscriptionExpiry}
                      onChange={(e) => setSubscriptionExpiry(e.target.value)}
                      className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner"
                    />
                  </div>
                            {/* Branding Personalizado (Colores) */}
                <div className="border-t border-arena/20 pt-4 space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-salvia">Personalización de Marca Blanca (Tema y Colores)</h4>
                  
                  {/* Presets de Color */}
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase tracking-wider text-gris opacity-70">Ajustes Rápidos (Paletas de Colores)</Label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setPrimaryColor(preset.primaryColor);
                            setSecondaryColor(preset.secondaryColor);
                            setAccentColor(preset.accentColor);
                            setBackgroundColor(preset.backgroundColor);
                            setTextColor(preset.textColor);
                            setUseWoodTexture(preset.useWoodTexture);
                          }}
                          className="px-2.5 py-1 text-[9px] font-bold rounded-lg border hover:bg-salvia hover:text-white transition-colors cursor-pointer text-gris bg-arena/40"
                          style={{ borderColor: preset.primaryColor }}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Textura */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="useWoodTexture"
                      type="checkbox"
                      checked={useWoodTexture}
                      onChange={(e) => setUseWoodTexture(e.target.checked)}
                      className="rounded border-none bg-white h-4 w-4 cursor-pointer accent-salvia"
                    />
                    <Label htmlFor="useWoodTexture" className="text-[10px] font-bold uppercase tracking-widest text-gris opacity-80 cursor-pointer">Habilitar Textura de Madera en Tarjetas</Label>
                  </div>

                  {/* Selector Manual */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[9px] font-bold uppercase tracking-wider text-gris opacity-70">Personalización Manual de Colores</Label>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="flex flex-col items-center gap-1">
                        <Label htmlFor="color-salvia" className="text-[8px] font-bold uppercase text-gris opacity-70 text-center">Principal</Label>
                        <input
                          id="color-salvia"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Color principal de botones y selecciones"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Label htmlFor="color-arena" className="text-[8px] font-bold uppercase text-gris opacity-70 text-center">Tarjetas</Label>
                        <input
                          id="color-arena"
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Color secundario de las tarjetas principales"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Label htmlFor="color-terracota" className="text-[8px] font-bold uppercase text-gris opacity-70 text-center">Acentos</Label>
                        <input
                          id="color-terracota"
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Color de títulos destacados y llamadas a la acción"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Label htmlFor="color-marfil" className="text-[8px] font-bold uppercase text-gris opacity-70 text-center">Fondo</Label>
                        <input
                          id="color-marfil"
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Color de fondo de las páginas de la plataforma"
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Label htmlFor="color-gris" className="text-[8px] font-bold uppercase text-gris opacity-70 text-center">Letra</Label>
                        <input
                          id="color-gris"
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                          title="Color de lectura para el texto"
                        />
                      </div>
                    </div>
                  </div>
                </div>       </div>

                <div className="flex justify-end gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="rounded-full border border-gris/20 px-6 py-2 text-xs font-bold uppercase tracking-widest text-gris hover:bg-white/50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-full bg-salvia px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md"
                  >
                    Guardar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL GESTIONAR SUSCRIPCION */}
        {isManageModalOpen && selectedStudioForManage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-2xl rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-full text-gris/75 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <span className="mb-1 block text-[9px] font-bold tracking-[0.2em] uppercase text-terracota">
                Gestión de Suscripción SaaS
              </span>
              <h3 className="font-serif text-3xl text-gris mb-1">
                {selectedStudioForManage.name}
              </h3>
              <p className="text-xs text-gris/60 mb-6">
                Subdominio: <span className="font-mono">{selectedStudioForManage.subdomain}.uioyoga.com</span>
              </p>

              {/* Detalles y Activación Rápida */}
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                
                {/* Gestión del Plan (Editable) */}
                <Card className="rounded-[24px] border border-white/10 bg-black/45 shadow-inner p-5 space-y-3">
                  <h4 className="font-serif text-base text-salvia font-semibold flex items-center gap-1.5">
                    <Info className="h-4 w-4" /> Gestión de Plan
                  </h4>
                  <div className="text-xs space-y-3 text-gris">
                    
                    <div className="space-y-1">
                      <Label htmlFor="editPlan" className="text-[9px] font-bold uppercase text-gris/60">Plan Tarifario</Label>
                      <select
                        id="editPlan"
                        value={editPlan}
                        onChange={(e) => setEditPlan(e.target.value)}
                        className="flex h-9 w-full rounded-xl border-none bg-arena/85 text-gris px-3 py-1.5 text-xs shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                      >
                        <option value="basic">Básico</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="editStatus" className="text-[9px] font-bold uppercase text-gris/60">Estado del Estudio</Label>
                      <select
                        id="editStatus"
                        value={editStatus}
                        onChange={(e: any) => setEditStatus(e.target.value)}
                        className="flex h-9 w-full rounded-xl border-none bg-arena/85 text-gris px-3 py-1.5 text-xs shadow-inner focus:outline-none focus:ring-1 focus:ring-salvia"
                      >
                        <option value="active">Activo</option>
                        <option value="suspended">Suspendido / Bloqueado</option>
                        <option value="trial">Prueba (Trial)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="editExpiry" className="text-[9px] font-bold uppercase text-gris/60">Fecha de Vencimiento</Label>
                      <Input
                        id="editExpiry"
                        type="date"
                        value={editExpiry}
                        onChange={(e) => setEditExpiry(e.target.value)}
                        className="h-9 rounded-xl text-xs bg-arena/85 border-none text-gris shadow-inner"
                      />
                    </div>

                    <Button
                      type="button"
                      disabled={isUpdatingStudioDetails}
                      onClick={handleUpdateStudioDetails}
                      className="w-full h-9 mt-1 rounded-full bg-salvia text-[10px] font-bold uppercase tracking-widest text-white hover:bg-salvia/90 cursor-pointer shadow-md"
                    >
                      {isUpdatingStudioDetails ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                </Card>

                {/* Activación Manual Directa (Renovación 1 mes) */}
                <Card className="rounded-[24px] border border-white/10 bg-black/45 shadow-inner p-5 flex flex-col justify-between">
                  <div>
                    <h4 className="font-serif text-base text-terracota font-semibold mb-2">Activación Rápida (+30d)</h4>
                    <p className="text-[10px] text-gris/70 leading-relaxed mb-3">
                      Renueva la suscripción por 1 mes (30 días) desde su vencimiento actual o desde hoy si ya venció.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Observación (ej: Pago WhatsApp)"
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="h-9 rounded-xl text-xs bg-arena/85 border-none text-gris shadow-inner"
                    />
                    <Button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleActivateSubscription()}
                      className="w-full h-9 rounded-full bg-salvia text-[10px] font-bold uppercase tracking-widest text-white hover:bg-salvia/90 cursor-pointer shadow-md"
                    >
                      {actionLoading ? 'Procesando...' : 'Activar Suscripción'}
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Log de reportes de pago */}
              <div className="space-y-3">
                <h4 className="font-serif text-lg text-gris font-medium">Reportes de Pago Recientes</h4>
                {manageHistoryLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
                  </div>
                ) : manageHistory.length > 0 ? (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {manageHistory.map((report) => (
                      <div key={report.id} className="p-4 bg-black/35 rounded-2xl border border-white/10 text-xs space-y-3 shadow-inner">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gris">
                            Reportado: {new Date(report.createdAt).toLocaleString()}
                          </span>
                          <span className={`font-bold uppercase tracking-wider text-[8px] px-2 py-0.5 rounded-full ${
                            report.status === 'approved' 
                              ? 'bg-green-500/20 text-green-600' 
                              : report.status === 'rejected'
                                ? 'bg-red-500/20 text-red-600'
                                : 'bg-amber-500/20 text-amber-600'
                          }`}>
                            {report.status === 'approved' ? 'Aprobado' : report.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-gris/80 border-b border-arena/20 pb-2">
                          <p>Monto: <strong className="text-gris">${report.amount.toFixed(2)}</strong></p>
                          <p>Plan solicitado: <strong className="text-gris capitalize">{report.subscriptionPlan}</strong></p>
                          <p>Fecha de transferencia: <strong className="text-gris">{report.transferDate}</strong></p>
                          <p>Referencia: <strong className="text-gris font-mono">{report.referenceNumber}</strong></p>
                          {report.remarks && <p className="col-span-2 text-gris/70">Nota del cliente: "{report.remarks}"</p>}
                        </div>

                        {/* Visualizar comprobante */}
                        {report.receiptUrl && (
                          <div className="flex items-center gap-2 bg-arena/25 p-2 rounded-xl border border-arena/20">
                            <FileText className="h-4 w-4 text-salvia" />
                            <span className="flex-1 truncate text-[10px] text-gris/70">Comprobante adjunto</span>
                            <a
                              href={report.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold uppercase tracking-widest text-salvia hover:text-salvia/85 underline"
                            >
                              Ver / Descargar
                            </a>
                          </div>
                        )}

                        {/* Metadatos de aprobación o rechazo */}
                        {report.status === 'approved' && report.processedAt && (
                          <div className="text-[10px] text-salvia font-medium">
                            Aprobado el {new Date(report.processedAt).toLocaleDateString()} por {report.processedBy}
                            {report.activationNotes && <p className="text-gris/65 font-normal">Nota: "{report.activationNotes}"</p>}
                          </div>
                        )}

                        {report.status === 'rejected' && report.rejectedReason && (
                          <div className="text-[10px] text-red-500 font-semibold">
                            Rechazado el {new Date(report.processedAt || report.createdAt).toLocaleDateString()} por {report.processedBy || 'admin'}
                            <p className="text-gris/65 font-normal">Motivo: "{report.rejectedReason}"</p>
                          </div>
                        )}

                        {/* Acciones para reportes pendientes */}
                        {report.status === 'pending' && (
                          <div className="pt-1.5 space-y-3">
                            {showRejectInput === report.id ? (
                              <div className="space-y-2">
                                <Label className="text-[9px] font-bold uppercase text-red-500">Motivo del Rechazo</Label>
                                <textarea
                                  placeholder="Ej: Comprobante ilegible, monto incompleto, etc."
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="w-full text-xs p-2.5 rounded-xl bg-arena/85 border-none text-gris focus:outline-none focus:ring-1 focus:ring-red-400"
                                  rows={2}
                                />
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setShowRejectInput(null);
                                      setRejectionReason('');
                                    }}
                                    className="h-8 px-4 rounded-full border border-gris/10 bg-transparent text-[9px] font-bold uppercase text-gris hover:bg-white cursor-pointer"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleRejectPayment(report)}
                                    className="h-8 px-5 rounded-full bg-red-500 text-[9px] font-bold uppercase text-white hover:bg-red-600 cursor-pointer"
                                  >
                                    Confirmar Rechazo
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  type="button"
                                  onClick={() => setShowRejectInput(report.id)}
                                  className="h-8 px-4 rounded-full border border-red-200 bg-transparent text-[10px] font-bold uppercase text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  Rechazar
                                </Button>
                                <Button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => handleActivateSubscription(report)}
                                  className="h-8 px-5 rounded-full bg-salvia text-[10px] font-bold uppercase text-white hover:bg-salvia/90 cursor-pointer"
                                >
                                  {actionLoading ? 'Aprobando...' : 'Aprobar y Activar'}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gris/50 text-xs bg-black/40 rounded-2xl border border-white/10">
                    No hay reportes de pago registrados para este estudio.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
