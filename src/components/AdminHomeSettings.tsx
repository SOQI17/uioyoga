import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadToCloudinary } from '../lib/cloudinary';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { motion } from 'framer-motion';

const DEFAULT_SETTINGS = {
  heroTitle: 'Respira, conecta y transforma',
  heroSubtitle: 'Una experiencia de bienestar integral diseñada para elevar tu energía y encontrar la calma en el centro de tu ser. Bienvenidos a la comunidad UIO.',
  heroImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1840&auto=format&fit=crop',
  philosophyTitle: 'Nuestra Filosofía',
  philosophyText: 'En UIO Yoga, creemos que el verdadero bienestar nace de la perfecta armonía entre el cuerpo, la mente y el entorno. Hemos creado un santuario digital y físico donde el diseño minimalista se encuentra con prácticas milenarias.\n\nNuestra misión es acompañarte en tu viaje hacia el equilibrio interior, ofreciéndote herramientas y espacios que inspiran calma y elegancia.',
  philosophyImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1840&auto=format&fit=crop',
  teaserImage: '',
  splashTitle: 'UIO YOGA',
  splashSubtitle: 'Vive la experiencia',
  splashImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1000&auto=format&fit=crop'
};

interface AdminHomeSettingsProps {
  onSuccess: () => void;
}

export function AdminHomeSettings({ onSuccess }: AdminHomeSettingsProps) {
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [philosophyTitle, setPhilosophyTitle] = useState('');
  const [philosophyText, setPhilosophyText] = useState('');
  const [philosophyImage, setPhilosophyImage] = useState('');
  const [teaserImage, setTeaserImage] = useState('');
  const [splashTitle, setSplashTitle] = useState('');
  const [splashSubtitle, setSplashSubtitle] = useState('');
  const [splashImage, setSplashImage] = useState('');
  
  const [heroUploading, setHeroUploading] = useState(false);
  const [philosophyUploading, setPhilosophyUploading] = useState(false);
  const [teaserUploading, setTeaserUploading] = useState(false);
  const [splashUploading, setSplashUploading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const docRef = doc(db, 'settings', 'home');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHeroTitle(data.heroTitle || DEFAULT_SETTINGS.heroTitle);
          setHeroSubtitle(data.heroSubtitle || DEFAULT_SETTINGS.heroSubtitle);
          setHeroImage(data.heroImage || DEFAULT_SETTINGS.heroImage);
          setPhilosophyTitle(data.philosophyTitle || DEFAULT_SETTINGS.philosophyTitle);
          setPhilosophyText(data.philosophyText || DEFAULT_SETTINGS.philosophyText);
          setPhilosophyImage(data.philosophyImage || DEFAULT_SETTINGS.philosophyImage);
          setTeaserImage(data.teaserImage || DEFAULT_SETTINGS.teaserImage);
          setSplashTitle(data.splashTitle || DEFAULT_SETTINGS.splashTitle);
          setSplashSubtitle(data.splashSubtitle || DEFAULT_SETTINGS.splashSubtitle);
          setSplashImage(data.splashImage || DEFAULT_SETTINGS.splashImage);
        } else {
          setHeroTitle(DEFAULT_SETTINGS.heroTitle);
          setHeroSubtitle(DEFAULT_SETTINGS.heroSubtitle);
          setHeroImage(DEFAULT_SETTINGS.heroImage);
          setPhilosophyTitle(DEFAULT_SETTINGS.philosophyTitle);
          setPhilosophyText(DEFAULT_SETTINGS.philosophyText);
          setPhilosophyImage(DEFAULT_SETTINGS.philosophyImage);
          setTeaserImage(DEFAULT_SETTINGS.teaserImage);
          setSplashTitle(DEFAULT_SETTINGS.splashTitle);
          setSplashSubtitle(DEFAULT_SETTINGS.splashSubtitle);
          setSplashImage(DEFAULT_SETTINGS.splashImage);
        }
      } catch (err) {
        console.error("Error loading home settings:", err);
      } finally {
        setFetching(false);
      }
    }
    loadSettings();
  }, []);

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file);
      setHeroImage(url);
    } catch (err: any) {
      console.error("Error uploading hero image:", err);
      setError(err.message || 'Error al subir la imagen principal a Cloudinary. Verifica las credenciales en tu archivo .env');
    } finally {
      setHeroUploading(false);
    }
  };

  const handlePhilosophyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhilosophyUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file);
      setPhilosophyImage(url);
    } catch (err: any) {
      console.error("Error uploading philosophy image:", err);
      setError(err.message || 'Error al subir la imagen de filosofía a Cloudinary. Verifica las credenciales en tu archivo .env');
    } finally {
      setPhilosophyUploading(false);
    }
  };

  const handleTeaserImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTeaserUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file);
      setTeaserImage(url);
    } catch (err: any) {
      console.error("Error uploading teaser image:", err);
      setError(err.message || 'Error al subir la imagen del círculo central a Cloudinary.');
    } finally {
      setTeaserUploading(false);
    }
  };

  const handleSplashImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSplashUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file);
      setSplashImage(url);
    } catch (err: any) {
      console.error("Error uploading splash image:", err);
      setError(err.message || 'Error al subir la imagen de bienvenida a Cloudinary.');
    } finally {
      setSplashUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const settingsData = {
      heroTitle,
      heroSubtitle,
      heroImage,
      philosophyTitle,
      philosophyText,
      philosophyImage,
      teaserImage,
      splashTitle,
      splashSubtitle,
      splashImage,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'settings', 'home'), settingsData);
      alert("¡Ajustes de inicio guardados correctamente!");
      onSuccess();
    } catch (err: any) {
      console.error("Error saving home settings:", err);
      setError(err.message || 'Error al guardar los ajustes.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-salvia"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* HERO SECTION */}
        <div className="bg-marfil/40 p-6 rounded-3xl border border-arena/30 space-y-4">
          <h4 className="font-serif text-lg text-gris font-medium border-b border-arena pb-2">Sección Principal (Hero)</h4>
          
          <div className="space-y-1">
            <Label htmlFor="heroTitle" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Título Principal (Home)</Label>
            <textarea
              id="heroTitle"
              required
              rows={2}
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              className="flex w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia focus:outline-none"
              placeholder="Ej. Respira, conecta y transforma"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="heroSubtitle" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Subtítulo Descriptivo</Label>
            <textarea
              id="heroSubtitle"
              required
              rows={3}
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              className="flex w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia focus:outline-none"
              placeholder="Escribe la descripción corta del santuario..."
            />
          </div>

          {/* HERO WALLPAPER Uploader */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Fondo de Pantalla Principal (Hero Wallpaper)</Label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-4 rounded-2xl border border-arena/30">
              {heroImage && (
                <img src={heroImage} alt="Hero Preview" className="w-24 h-16 rounded-xl object-cover shadow-sm border border-arena bg-arena" />
              )}
              <div className="flex-1 w-full">
                <input
                  id="hero-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleHeroImageUpload}
                  disabled={heroUploading}
                  className="hidden"
                />
                <label
                  htmlFor="hero-image-upload"
                  className="flex items-center justify-center w-full rounded-full border border-salvia/30 text-salvia bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-salvia/10 select-none transition-colors text-center border-dashed border-2"
                >
                  {heroUploading ? 'Subiendo...' : heroImage ? 'Cambiar Imagen de Fondo' : 'Subir Imagen de Fondo'}
                </label>
              </div>
            </div>
          </div>

          {/* TEASER IMAGE (CENTRAL ORB) Uploader */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Foto de Reemplazo para el Círculo Central ("UIO Room")</Label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-4 rounded-2xl border border-arena/30">
              {teaserImage && (
                <img src={teaserImage} alt="Teaser Preview" className="w-16 h-16 rounded-full object-cover shadow-sm border border-arena bg-arena" />
              )}
              <div className="flex-1 w-full">
                <input
                  id="teaser-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleTeaserImageUpload}
                  disabled={teaserUploading}
                  className="hidden"
                />
                <label
                  htmlFor="teaser-image-upload"
                  className="flex items-center justify-center w-full rounded-full border border-salvia/30 text-salvia bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-salvia/10 select-none transition-colors text-center border-dashed border-2"
                >
                  {teaserUploading ? 'Subiendo...' : teaserImage ? 'Cambiar Foto del Círculo' : 'Subir Foto para el Círculo'}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* PHILOSOPHY SECTION */}
        <div className="bg-marfil/40 p-6 rounded-3xl border border-arena/30 space-y-4">
          <h4 className="font-serif text-lg text-gris font-medium border-b border-arena pb-2">Sección Filosofía</h4>
          
          <div className="space-y-1">
            <Label htmlFor="philosophyTitle" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Título de la Sección</Label>
            <input
              id="philosophyTitle"
              required
              value={philosophyTitle}
              onChange={(e) => setPhilosophyTitle(e.target.value)}
              className="flex w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia focus:outline-none"
              placeholder="Ej. Nuestra Filosofía"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="philosophyText" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Contenido del Texto</Label>
            <textarea
              id="philosophyText"
              required
              rows={5}
              value={philosophyText}
              onChange={(e) => setPhilosophyText(e.target.value)}
              className="flex w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia focus:outline-none"
              placeholder="Escribe la filosofía de UIO Yoga..."
            />
          </div>

          {/* PHILOSOPHY IMAGE Uploader */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Imagen de Filosofía</Label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-4 rounded-2xl border border-arena/30">
              {philosophyImage && (
                <img src={philosophyImage} alt="Philosophy Preview" className="w-24 h-16 rounded-xl object-cover shadow-sm border border-arena bg-arena" />
              )}
              <div className="flex-1 w-full">
                <input
                  id="philosophy-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhilosophyImageUpload}
                  disabled={philosophyUploading}
                  className="hidden"
                />
                <label
                  htmlFor="philosophy-image-upload"
                  className="flex items-center justify-center w-full rounded-full border border-salvia/30 text-salvia bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-salvia/10 select-none transition-colors text-center border-dashed border-2"
                >
                  {philosophyUploading ? 'Subiendo...' : philosophyImage ? 'Cambiar Imagen de Filosofía' : 'Subir Imagen de Filosofía'}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* SPLASH SCREEN SECTION */}
        <div className="bg-marfil/40 p-6 rounded-3xl border border-arena/30 space-y-4">
          <h4 className="font-serif text-lg text-gris font-medium border-b border-arena pb-2">Pantalla de Bienvenida (Splash Screen)</h4>
          
          <div className="space-y-1">
            <Label htmlFor="splashTitle" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Título de Bienvenida</Label>
            <input
              id="splashTitle"
              required
              value={splashTitle}
              onChange={(e) => setSplashTitle(e.target.value)}
              className="flex w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia focus:outline-none"
              placeholder="Ej. UIO YOGA"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="splashSubtitle" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Subtítulo o Eslogan</Label>
            <input
              id="splashSubtitle"
              required
              value={splashSubtitle}
              onChange={(e) => setSplashSubtitle(e.target.value)}
              className="flex w-full rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia focus:outline-none"
              placeholder="Ej. Vive la experiencia"
            />
          </div>

          {/* SPLASH IMAGE Uploader */}
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Imagen de Fondo de Bienvenida</Label>
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-4 rounded-2xl border border-arena/30">
              {splashImage && (
                <img src={splashImage} alt="Splash Preview" className="w-24 h-16 rounded-xl object-cover shadow-sm border border-arena bg-arena" />
              )}
              <div className="flex-1 w-full">
                <input
                  id="splash-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSplashImageUpload}
                  disabled={splashUploading}
                  className="hidden"
                />
                <label
                  htmlFor="splash-image-upload"
                  className="flex items-center justify-center w-full rounded-full border border-salvia/30 text-salvia bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-salvia/10 select-none transition-colors text-center border-dashed border-2"
                >
                  {splashUploading ? 'Subiendo...' : splashImage ? 'Cambiar Foto de Entrada' : 'Subir Foto de Entrada'}
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={loading || heroUploading || philosophyUploading || teaserUploading || splashUploading}
            className="rounded-full bg-salvia px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md"
          >
            {loading ? 'Guardando Ajustes...' : 'Guardar Todos los Ajustes'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
