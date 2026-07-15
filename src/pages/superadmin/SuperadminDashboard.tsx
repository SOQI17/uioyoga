import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, Edit2, Trash2, Users, CreditCard, Building } from 'lucide-react';
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
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  studioId?: string;
}

export function SuperadminDashboard() {
  const [studios, setStudios] = useState<StudioInfo[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
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

  const { user } = useAuthStore();
  const navigate = useNavigate();

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
      const list = snap.docs.map(doc => doc.data() as UserProfile);
      setUsers(list);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchStudios(), fetchUsers()]);
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
        await setDoc(doc(db, 'settings', docId), {
          heroTitle: `Santuario de Yoga ${name}`,
          heroSubtitle: `Una experiencia de bienestar integral diseñada para elevar tu energía en la comunidad ${name}.`,
          philosophyTitle: 'Nuestra Filosofía',
          philosophyText: `En ${name}, creemos en la armonía entre cuerpo y mente.`,
          splashTitle: name.toUpperCase(),
          splashSubtitle: 'Vive la experiencia',
          createdAt: new Date().toISOString()
        });
      }

      // If an ownerId was assigned, update the owner's user document role and studioId
      if (ownerId.trim()) {
        const ownerRef = doc(db, 'users', ownerId.trim());
        await updateDoc(ownerRef, {
          role: 'admin',
          studioId: docId
        });
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
      await deleteDoc(doc(db, 'studios', id));
      await deleteDoc(doc(db, 'settings', id));
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
                        <Button variant="outline" onClick={() => handleOpenEdit(studio)} className="p-2 border border-arena hover:bg-arena text-gris rounded-xl">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" onClick={() => handleDeleteStudio(studio.id)} className="p-2 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded-xl">
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

        {/* Modal Form */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 relative overflow-hidden"
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
                    <Label htmlFor="owner" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Asignar Owner (UID del Admin)</Label>
                    <select
                      id="owner"
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className="flex h-10 w-full rounded-2xl border-none bg-white px-4 py-2 text-sm shadow-inner focus:outline-none"
                    >
                      <option value="">-- Ninguno / Selecciona Usuario --</option>
                      {users.map(u => (
                        <option key={u.uid} value={u.uid}>{u.name} ({u.email}) [{u.role}]</option>
                      ))}
                    </select>
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
                </div>

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
      </div>
    </div>
  );
}
