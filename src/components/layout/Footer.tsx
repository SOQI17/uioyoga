import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db, getTenantId } from '../../lib/firebase';
import { useTenantStore } from '../../store/tenantStore';

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

  const { tenantSettings } = useTenantStore();

  const googleReviewsUrl = tenantSettings?.googleReviewsUrl || 'https://maps.app.goo.gl/E7wfaMmPs2viQNSo7';
  const instagramUrl = tenantSettings?.instagramUrl || 'https://instagram.com/uioyoga';
  const facebookUrl = tenantSettings?.facebookUrl || 'https://facebook.com/uioyoga';
  const whatsappNumber = tenantSettings?.whatsappNumber || '+593999999999';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9+]/g, '');

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

      {/* Redes Sociales & Google Business Integration Bar */}
      <div className="border-t border-arena/30 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gris/70">
        <div className="flex items-center gap-2">
          <span className="font-serif font-bold text-gris text-sm">UIO YOGA</span>
          <span className="opacity-40">•</span>
          <span className="text-xs">© {new Date().getFullYear()} Todos los derechos reservados.</span>
        </div>

        {/* Professional Vector Social Media Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Google Reviews Badge */}
          <a
            href={googleReviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#18181b] text-white hover:bg-black px-4 py-2 rounded-full border border-white/15 shadow-sm text-xs font-bold transition-all hover:scale-105 group cursor-pointer"
            title="Ver reseñas en Google Maps"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Google Reviews</span>
            <span className="text-amber-400 font-serif text-xs font-black">5.0 ★</span>
          </a>

          {/* Instagram */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#18181b] text-white hover:bg-[#e1306c] px-3.5 py-2 rounded-full border border-white/15 shadow-sm text-xs font-bold transition-all hover:scale-105 cursor-pointer"
            title="Síguenos en Instagram"
          >
            <svg className="w-4 h-4 fill-current text-pink-400 shrink-0" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span>Instagram</span>
          </a>

          {/* Facebook */}
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#18181b] text-white hover:bg-[#1877f2] px-3.5 py-2 rounded-full border border-white/15 shadow-sm text-xs font-bold transition-all hover:scale-105 cursor-pointer"
            title="Síguenos en Facebook"
          >
            <svg className="w-4 h-4 fill-current text-blue-400 shrink-0" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${cleanWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#18181b] text-white hover:bg-[#25d366] hover:text-black px-3.5 py-2 rounded-full border border-white/15 shadow-sm text-xs font-bold transition-all hover:scale-105 cursor-pointer"
            title="Escríbenos a WhatsApp"
          >
            <svg className="w-4 h-4 fill-current text-emerald-400 shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
