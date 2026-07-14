import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Menu, X, User } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function Navbar() {
  const { user, userData } = useAuthStore();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('UIO YOGA');

  useEffect(() => {
    async function loadLogo() {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'home'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setLogoUrl(data.teaserImage || '');
          if (data.splashTitle) {
            setBrandName(data.splashTitle);
          }
        }
      } catch (err) {
        console.error("Error loading logo in Navbar:", err);
      }
    }
    loadLogo();
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: userData?.role === 'admin' ? 'Administración' : 'Mi Espacio', path: '/dashboard' },
    { name: 'Agendamiento', path: '/schedule' },
    { name: 'Retiros', path: '/retreats' },
  ];

  const firstWord = brandName.split(' ')[0];
  const restOfName = brandName.split(' ').slice(1).join(' ');

  return (
    <nav className="sticky top-0 z-50 w-full shrink-0 border-b border-arena bg-marfil">
      <div className="flex h-20 items-center justify-between px-4 md:px-12">
        <Link to="/" className="flex items-center gap-2">
          {logoUrl ? (
            <div className="h-8 w-8 overflow-hidden rounded-full border border-salvia/40 shrink-0 shadow-sm bg-arena">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-salvia shrink-0">
              <div className="h-4 w-4 rounded-full border-2 border-white"></div>
            </div>
          )}
          <span className="font-serif text-2xl font-semibold tracking-tight text-gris uppercase">
            {firstWord} {restOfName && <span className="font-light opacity-60">{restOfName}</span>}
          </span>
        </Link>
        
        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex text-xs font-medium uppercase tracking-widest">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative pb-1 transition-all ${
                location.pathname === link.path ? 'border-b border-terracota text-gris opacity-100' : 'text-gris opacity-50 hover:opacity-100'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
        
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase leading-none opacity-40">Próxima Clase</p>
                <p className="text-xs font-medium">Hatha Yoga • 18:00</p>
              </div>
              <Link to="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-arena p-0.5 hover:border-salvia transition-colors">
                <div className="h-full w-full rounded-full bg-salvia/20 flex items-center justify-center text-salvia">
                  <User className="h-4 w-4" />
                </div>
              </Link>
            </div>
          ) : (
            <>
              <Link to="/login" className="text-xs font-medium uppercase tracking-widest text-gris opacity-50 hover:opacity-100">
                Ingresar
              </Link>
              <Link to="/register">
                <Button className="rounded-full bg-salvia px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-sm">
                  Registro
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="p-2 text-gris md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute left-0 top-20 w-full overflow-hidden border-b border-arena bg-marfil px-4 py-6 shadow-lg md:hidden z-40"
          >
            <div className="flex flex-col gap-4 text-sm font-medium uppercase tracking-widest">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`transition-colors hover:text-salvia ${
                    location.pathname === link.path ? 'text-terracota' : 'text-gris/70'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-4 border-t border-arena pt-4">
                {user ? (
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-salvia">
                    <User className="h-4 w-4" />
                    Mi Espacio
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)} className="text-gris/70 hover:text-salvia">
                      Ingresar
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)} className="text-salvia hover:text-salvia/80">
                      Registro
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
