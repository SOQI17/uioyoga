import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';
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
}

const DEFAULT_SETTINGS = {
  heroTitle: 'Respira, conecta y transforma',
  heroSubtitle: 'Una experiencia de bienestar integral diseñada para elevar tu energía y encontrar la calma en el centro de tu ser. Bienvenidos a la comunidad Kukut.',
  heroImage: 'https://images.unsplash.com/photo-1599901860904-17e08c3a4cb1?q=80&w=2070&auto=format&fit=crop',
  philosophyTitle: 'Nuestra Filosofía',
  philosophyText: 'En Kukut Yoga, creemos que el verdadero bienestar nace de la perfecta armonía entre el cuerpo, la mente y el entorno. Hemos creado un santuario digital y físico donde el diseño minimalista se encuentra con prácticas milenarias.\n\nNuestra misión es acompañarte en tu viaje hacia el equilibrio interior, ofreciéndote herramientas y espacios que inspiran calma y elegancia.',
  philosophyImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1840&auto=format&fit=crop',
  teaserImage: '',
  splashTitle: 'KUKUT YOGA',
  splashSubtitle: 'Vive la experiencia',
  splashImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop'
};

export function Home() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [featuredClasses, setFeaturedClasses] = useState<YogaClass[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showSplash, setShowSplash] = useState(() => {
    // Check if splash was shown in the current page load session
    return !(window as any).__kukut_splash_shown;
  });

  const handleDismissSplash = () => {
    (window as any).__kukut_splash_shown = true;
    setShowSplash(false);
  };

  useEffect(() => {
    async function loadData() {
      try {
        // Load custom homepage settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'home'));
        if (settingsSnap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...settingsSnap.data() });
        }

        // Load featured classes (up to 3)
        const q = query(collection(db, 'classes'), where('featured', '==', true), limit(3));
        const classesSnap = await getDocs(q);
        if (!classesSnap.empty) {
          setFeaturedClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as YogaClass)));
        } else {
          // Fallback to top 3 upcoming classes if no featured flag is present
          const fallbackSnap = await getDocs(query(collection(db, 'classes'), limit(3)));
          setFeaturedClasses(fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as YogaClass)));
        }
      } catch (err) {
        console.error("Error loading home page data:", err);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadData();
  }, []);

  if (loadingSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-t-2 border-b-2 border-salvia"></div>
      </div>
    );
  }

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={settings.splashImage || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop'} 
            alt="Splash Welcome Background" 
            className="w-full h-full object-cover opacity-35 filter brightness-75 contrast-110" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-salvia mb-8 shadow-lg"
          >
            <div className="h-6 w-6 rounded-full border-2 border-white"></div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-white mb-4 uppercase drop-shadow-md"
          >
            {settings.splashTitle || 'KUKUT YOGA'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.6 }}
            className="text-lg md:text-xl font-light text-white/70 italic font-serif mb-12 tracking-wide"
          >
            {settings.splashSubtitle || 'Vive la experiencia'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.9 }}
            className="w-full flex justify-center"
          >
            <Button 
              onClick={handleDismissSplash}
              className="rounded-full bg-salvia px-12 py-6 text-sm font-bold uppercase tracking-[0.2em] text-white hover:bg-salvia/90 hover:shadow-[0_0_25px_rgba(156,166,136,0.4)] transition-all duration-300 w-fit cursor-pointer"
            >
              Entrar
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Sleek Hero Section */}
      <section className="relative flex min-h-[calc(100vh-80px)] flex-col lg:flex-row overflow-hidden bg-marfil">
        <div className="flex w-full lg:w-[450px] shrink-0 flex-col justify-center p-8 lg:p-12 z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <span className="mb-4 block text-sm font-medium tracking-[0.2em] uppercase text-terracota">Filosofía & Conexión</span>
            <h1 className="mb-8 font-serif text-5xl leading-[1.1] text-gris md:text-6xl whitespace-pre-line">
              {settings.heroTitle}
            </h1>
            <p className="mb-10 pr-6 leading-relaxed text-gris/80">
              {settings.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/schedule">
                <Button className="rounded-full bg-salvia px-8 py-6 text-sm font-medium text-white hover:bg-salvia/90 hover:shadow-lg">
                  Comienza ahora
                </Button>
              </Link>
              <Link to="/schedule">
                <Button variant="outline" className="rounded-full border border-salvia bg-transparent px-8 py-6 text-sm font-medium text-salvia hover:bg-salvia/10">
                  Ver Horarios
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        
        <div className="relative flex-1 p-4 lg:p-8">
          <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
             className="relative h-full w-full min-h-[400px] overflow-hidden rounded-[40px] border-[12px] border-white bg-arena shadow-2xl"
          >
            <img
              src={settings.heroImage}
              alt="Yoga Background"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent"></div>
            
            {/* 3D Experience Teaser inside the image container */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Link to="/experience" className="group relative h-64 w-64 hover:scale-105 transition-transform duration-500 flex items-center justify-center">
                 {settings.teaserImage ? (
                   <div className="relative h-full w-full rounded-full overflow-hidden border-[6px] border-salvia/50 shadow-xl">
                     <img src={settings.teaserImage} alt="Kukut Room Teaser" className="w-full h-full object-cover opacity-85" />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                       <span className="font-serif italic text-white text-lg drop-shadow-md">Kukut Room</span>
                     </div>
                   </div>
                 ) : (
                   <>
                     <div className="absolute inset-0 rounded-full border-2 border-salvia/40 animate-pulse group-hover:border-salvia"></div>
                     <div className="absolute inset-8 rounded-full border-2 border-terracota/60 group-hover:border-terracota"></div>
                     <div className="absolute inset-0 flex items-center justify-center bg-marfil/10 rounded-full backdrop-blur-[2px]">
                       <span className="font-serif italic text-white text-lg drop-shadow-md">Kukut Room</span>
                     </div>
                   </>
                 )}
              </Link>
            </div>
            <div className="absolute left-8 top-8">
              <span className="rounded-full bg-white/80 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gris backdrop-blur-md shadow-sm">
                Modo Inmersivo 3D • Activo
              </span>
            </div>
            <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
               <div className="space-y-1">
                 <p className="font-serif text-xl text-white drop-shadow-md">Sala Principal</p>
                 <p className="text-xs text-white/90 drop-shadow-md">Explora nuestro santuario de luz y paz.</p>
               </div>
               <div className="flex gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md hover:bg-white/40 cursor-pointer">←</div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md hover:bg-white/40 cursor-pointer">→</div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Preview */}
      <section className="bg-marfil py-24 border-b border-arena/30">
        <div className="container mx-auto px-4 md:px-12">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="mb-6 font-serif text-4xl font-semibold text-gris md:text-5xl">{settings.philosophyTitle}</h2>
              <div className="mb-8 h-1 w-20 bg-terracota"></div>
              <div className="mb-8 text-lg font-light leading-relaxed text-gris/80 whitespace-pre-line">
                {settings.philosophyText}
              </div>
              <Link to="/about">
                <Button variant="outline" className="rounded-full border border-salvia px-8 py-6 text-xs font-bold uppercase tracking-widest text-salvia hover:bg-salvia hover:text-white">
                  Conoce nuestra historia
                </Button>
              </Link>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-square overflow-hidden rounded-[40px] border-[8px] border-white shadow-xl md:aspect-[4/5]"
            >
              <img
                src={settings.philosophyImage}
                alt="Filosofía Kukut"
                className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Classes Section */}
      {featuredClasses.length > 0 && (
        <section className="bg-marfil py-24">
          <div className="container mx-auto px-4 md:px-12">
            <div className="mb-16 text-center">
              <span className="mb-4 block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota">Clases destacadas</span>
              <h2 className="font-serif text-4xl font-semibold text-gris md:text-5xl">Tu Próximo Paso</h2>
              <div className="mx-auto mt-4 h-1 w-20 bg-salvia"></div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featuredClasses.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-[32px] border-[8px] border-white bg-arena shadow-md p-6 flex flex-col justify-between min-h-[320px]"
                >
                  <div>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-terracota shadow-sm">
                      {c.level}
                    </span>
                    <h3 className="font-serif text-2xl text-gris mt-6 mb-2 font-medium">{c.title}</h3>
                    <p className="text-xs text-gris/60 italic mb-6">Con {c.instructor}</p>
                    
                    <div className="space-y-2 text-xs text-gris/70 border-t border-white/50 pt-4">
                      <p className="capitalize">📅 {format(new Date(c.date), "EEEE d MMM, HH:mm 'hs'", { locale: es })}</p>
                      <p>⏱ {c.duration} minutos de duración</p>
                    </div>
                  </div>

                  <Link to="/schedule" className="mt-8">
                    <Button className="w-full rounded-full bg-gris py-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia transition-colors">
                      Ver Detalles
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Link to="/schedule">
                <Button variant="outline" className="rounded-full border border-salvia px-10 py-6 text-xs font-bold uppercase tracking-widest text-salvia hover:bg-salvia hover:text-white">
                  Explorar Calendario Completo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
