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
    <footer className="shrink-0 border-t border-arena bg-white/50 px-4 py-8 md:px-12 md:h-48 md:flex md:gap-8">
      {/* Dynamic Classes */}
      {featuredClasses.length > 0 ? (
        featuredClasses.map((c, i) => (
          <div key={c.id} className="mb-8 md:mb-0 md:w-1/4 space-y-4">
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
        <div className="mb-8 md:mb-0 md:w-2/4 text-xs text-gris/40 font-semibold self-center">
          Explora nuestros horarios para agendar tu práctica.
        </div>
      )}

      {/* Dynamic Retreat */}
      <div className="md:w-2/4 bg-salvia/10 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-12 h-12 bg-salvia rounded-full flex shrink-0 items-center justify-center text-white text-xl">◈</div>
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
    </footer>
  );
}
