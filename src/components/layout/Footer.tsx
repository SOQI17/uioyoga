import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db, getTenantId } from '../../lib/firebase';

interface FeaturedClass {
  id: string;
  title: string;
  level: string;
  duration: number;
  image?: string;
}

interface FeaturedRetreat {
  id: string;
  title: string;
  location: string;
  date: string;
}

export function Footer() {
  const [featuredClasses, setFeaturedClasses] = useState<FeaturedClass[]>([]);
  const [nextRetreat, setNextRetreat] = useState<FeaturedRetreat | null>(null);

  const googleReviewsUrl = 'https://maps.app.goo.gl/E7wfaMmPs2viQNSo7';

  useEffect(() => {
    async function loadFooterData() {
      try {
        // Load featured classes (up to 2)
        const qClasses = query(collection(db, 'classes'), where('tenantId', '==', getTenantId()), where('featured', '==', true), limit(2));
        const classesSnap = await getDocs(qClasses);
        let fetchedClasses: FeaturedClass[] = [];
        if (!classesSnap.empty) {
          fetchedClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedClass));
        } else {
          // Fallback to any 2 classes
          const fallbackSnap = await getDocs(query(collection(db, 'classes'), where('tenantId', '==', getTenantId()), limit(2)));
          fetchedClasses = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeaturedClass));
        }
        setFeaturedClasses(fetchedClasses);

        // Load next retreat (limit 1)
        const qRetreats = query(collection(db, 'retreats'), where('tenantId', '==', getTenantId()), limit(1));
        const retreatsSnap = await getDocs(qRetreats);
        if (!retreatsSnap.empty) {
          const r = retreatsSnap.docs[0];
          setNextRetreat({ id: r.id, ...r.data() } as FeaturedRetreat);
        }
      } catch (err) {
        console.error("Error loading footer data:", err);
      }
    }
    loadFooterData();
  }, []);

  return (
    <footer className="shrink-0 border-t border-arena bg-white/50 px-4 py-8 md:px-12 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center md:gap-8 justify-between">
        {/* Dynamic Classes */}
        {featuredClasses.length > 0 ? (
          featuredClasses.map((c, i) => (
            <div key={c.id} className="mb-6 md:mb-0 md:w-1/4 space-y-4">
              {i === 0 && (
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40 text-gris">
                  Clases Destacadas
                </h3>
              )}
              {i === 1 && (
                <div className="hidden md:block invisible text-[10px] uppercase tracking-widest opacity-40">-</div>
              )}
              <Link to="/schedule" className="flex items-center gap-4 group cursor-pointer">
                <div className="w-16 h-16 bg-salvia/20 rounded-xl overflow-hidden shrink-0 relative">
                  <img 
                    src={c.image || (i === 0 ? "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=200&auto=format&fit=crop" : "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=200&auto=format&fit=crop")} 
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-50 bg-arena" 
                    alt={c.title}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gris line-clamp-1">{c.title}</p>
                  <p className="text-xs text-gris/60 capitalize">{c.level} • {c.duration} min</p>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="mb-6 md:mb-0 md:w-2/4 text-xs text-gris/40 font-semibold self-center">
            Explora nuestros horarios para agendar tu práctica.
          </div>
        )}

        {/* Dynamic Retreat */}
        <div className="md:w-2/4 bg-salvia/10 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-salvia/20">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-12 h-12 bg-salvia rounded-full flex shrink-0 items-center justify-center text-white text-xl shadow-sm">◈</div>
            <div>
              <h4 className="font-serif text-lg text-gris line-clamp-1">
                {nextRetreat ? `Próximo Retiro: ${nextRetreat.title}` : 'Próximo Retiro: Valle Sagrado'}
              </h4>
              <p className="text-xs text-gris/60">
                {nextRetreat ? `${nextRetreat.location} • ${nextRetreat.date}` : 'Cusco, Perú • 12 - 18 de Octubre, 2024'}
              </p>
            </div>
          </div>
          <Link to="/retreats" className="shrink-0 bg-white text-salvia px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm hover:shadow-md transition-shadow">
            Reservar Cupo
          </Link>
        </div>
      </div>

      {/* Redes Sociales & Google Business Integration */}
      <div className="border-t border-arena/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gris/70">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-gris">UIO YOGA</span>
          <span className="opacity-40">•</span>
          <span>© {new Date().getFullYear()} Todos los derechos reservados.</span>
        </div>

        {/* Redes Sociales & Reseñas */}
        <div className="flex items-center gap-4">
          <a
            href={googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/80 hover:bg-white px-3.5 py-1.5 rounded-full border border-arena/30 shadow-sm text-xs font-bold text-gris transition-all hover:scale-105"
            title="Ver reseñas en Google Maps"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google Reviews (5.0 ★)</span>
          </a>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-salvia transition-colors p-2 bg-white/50 rounded-full border border-arena/20"
            title="Instagram"
          >
            📸
          </a>
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-salvia transition-colors p-2 bg-white/50 rounded-full border border-arena/20"
            title="Facebook"
          >
            📘
          </a>
          <a
            href="https://wa.me/593999999999"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-salvia transition-colors p-2 bg-white/50 rounded-full border border-arena/20"
            title="WhatsApp"
          >
            💬
          </a>
        </div>
      </div>
    </footer>
  );
}
