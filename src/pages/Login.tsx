import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, getTenantId } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      const isAdmin = userCredential.user.email?.toLowerCase() === 'suqisam@gmail.com';
      if (userDoc.exists()) {
        const uData = userDoc.data();
        if (!isAdmin && uData.tenantId && uData.tenantId !== getTenantId()) {
          await auth.signOut();
          setError('Tu cuenta pertenece a otro estudio de yoga.');
          setLoading(false);
          return;
        }
      }

      if (userDoc.exists() && userDoc.data().role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      const isAdmin = userCredential.user.email?.toLowerCase() === 'suqisam@gmail.com';
      if (userDoc.exists()) {
        const uData = userDoc.data();
        if (!isAdmin && uData.tenantId && uData.tenantId !== getTenantId()) {
          await auth.signOut();
          setError('Tu cuenta pertenece a otro estudio de yoga.');
          return;
        }
      }

      if (userDoc.exists() && userDoc.data().role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Error con Google Login');
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-marfil px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 md:p-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-bl-full pointer-events-none"></div>
        
        <div className="mb-10 text-center relative z-10">
          <span className="mb-2 block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota">UIO Yoga</span>
          <h1 className="mb-3 font-serif text-4xl font-medium text-gris">Bienvenido</h1>
          <p className="text-sm text-gris/70">Ingresa a tu espacio de bienestar</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6 relative z-10">
          <div className="space-y-3">
            <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Correo electrónico</Label>
            <Input 
              id="email" 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-2xl border-none bg-white px-6 py-6 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
              placeholder="tu@email.com"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Contraseña</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-2xl border-none bg-white px-6 py-6 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
              placeholder="••••••••"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full rounded-full bg-salvia py-6 text-xs font-bold tracking-widest uppercase text-white hover:bg-salvia/90 shadow-md mt-2"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <div className="my-8 flex items-center relative z-10">
          <div className="flex-1 border-t border-gris/10"></div>
          <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-gris/40">O continúa con</span>
          <div className="flex-1 border-t border-gris/10"></div>
        </div>

        <Button 
          variant="outline" 
          onClick={handleGoogleLogin}
          className="w-full rounded-full border border-white bg-white/50 py-6 text-xs font-bold tracking-widest uppercase text-gris hover:bg-white relative z-10 transition-colors"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="mr-3 h-4 w-4" />
          Google
        </Button>

        <p className="mt-8 text-center text-xs text-gris/70 relative z-10">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="font-bold text-salvia hover:text-salvia/80 transition-colors">
            REGÍSTRATE
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
