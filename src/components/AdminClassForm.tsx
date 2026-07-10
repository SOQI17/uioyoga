import { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { motion } from 'framer-motion';

interface YogaClass {
  id?: string;
  title: string;
  instructor: string;
  level: string;
  capacity: number;
  date: string; // ISO string
  duration: number; // minutes
  featured?: boolean;
  image?: string;
}

interface AdminClassFormProps {
  classToEdit?: YogaClass | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AdminClassForm({ classToEdit, onSuccess, onCancel }: AdminClassFormProps) {
  const [title, setTitle] = useState('');
  const [instructor, setInstructor] = useState('');
  const [level, setLevel] = useState('Principiante');
  const [capacity, setCapacity] = useState(20);
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(60);
  const [featured, setFeatured] = useState(false);
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (classToEdit) {
      setTitle(classToEdit.title);
      setInstructor(classToEdit.instructor);
      setLevel(classToEdit.level);
      setCapacity(classToEdit.capacity);
      setFeatured(classToEdit.featured || false);
      setImage(classToEdit.image || '');
      
      // Format ISO string to datetime-local input format (YYYY-MM-DDTHH:MM)
      if (classToEdit.date) {
        const d = new Date(classToEdit.date);
        const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        setDate(localISOTime);
      } else {
        setDate('');
      }
      setDuration(classToEdit.duration);
    } else {
      setTitle('');
      setInstructor('');
      setLevel('Principiante');
      setCapacity(20);
      setDate('');
      setDuration(60);
      setFeatured(false);
      setImage('');
    }
  }, [classToEdit]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fileRef = ref(storage, `classes/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setImage(url);
    } catch (err: any) {
      console.error("Error uploading image:", err);
      setError(err.message || 'Error al subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Convert local datetime to ISO string
    const isoDate = new Date(date).toISOString();

    const classData = {
      title,
      instructor,
      level,
      capacity: Number(capacity),
      date: isoDate,
      duration: Number(duration),
      featured,
      image,
    };

    try {
      if (classToEdit && classToEdit.id) {
        const classRef = doc(db, 'classes', classToEdit.id);
        await updateDoc(classRef, classData);
      } else {
        await addDoc(collection(db, 'classes'), classData);
      }
      onSuccess();
    } catch (err: any) {
      console.error("Error saving class:", err);
      setError(err.message || 'Error al guardar la clase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-lg rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-bl-full pointer-events-none"></div>
      
      <h3 className="font-serif text-3xl text-gris mb-6 relative z-10">
        {classToEdit && classToEdit.id ? 'Editar Clase' : classToEdit ? 'Duplicar Clase' : 'Crear Nueva Clase'}
      </h3>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="space-y-1">
          <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Título de la clase</Label>
          <Input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
            placeholder="Ej. Vinyasa Flow, Hatha Yoga"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="instructor" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Instructor(a)</Label>
          <Input
            id="instructor"
            required
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
            placeholder="Ej. Alexis, Sofía"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="level" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Nivel</Label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="flex h-10 w-full rounded-2xl border-none bg-white px-4 py-2 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia focus:outline-none"
            >
              <option value="Principiante">Principiante</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
              <option value="Todos los niveles">Todos los niveles</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="capacity" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Capacidad (Cupos)</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="date" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Fecha y Hora</Label>
            <Input
              id="date"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="duration" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Duración (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              required
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="rounded-2xl border-none bg-white px-4 py-3 text-sm shadow-inner focus-visible:ring-1 focus-visible:ring-salvia"
            />
          </div>
        </div>

        {/* IMAGE UPLOAD SECTION */}
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80">Foto de la Clase</Label>
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/50 p-4 rounded-2xl border border-arena/30">
            {image && (
              <img src={image} alt="Previsualización" className="w-16 h-16 rounded-xl object-cover shadow-sm border border-arena bg-arena" />
            )}
            <div className="flex-1 w-full">
              <input
                id="class-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
              <label
                htmlFor="class-image-upload"
                className="flex items-center justify-center w-full rounded-full border border-salvia/30 text-salvia bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-salvia/10 select-none transition-colors text-center"
              >
                {uploading ? 'Subiendo...' : image ? 'Cambiar Foto' : 'Subir Foto'}
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 py-2">
          <input
            id="featured"
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
            className="h-4 w-4 rounded border-arena bg-white text-salvia focus:ring-1 focus:ring-salvia accent-salvia cursor-pointer"
          />
          <Label htmlFor="featured" className="text-[10px] font-bold uppercase tracking-widest text-terracota opacity-80 cursor-pointer select-none">
            Clase Destacada (Mostrar en la página de inicio)
          </Label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="rounded-full border border-gris/20 px-6 py-2 text-xs font-bold uppercase tracking-widest text-gris hover:bg-white/50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || uploading}
            className="rounded-full bg-salvia px-6 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md"
          >
            {loading ? 'Guardando...' : 'Guardar Clase'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
