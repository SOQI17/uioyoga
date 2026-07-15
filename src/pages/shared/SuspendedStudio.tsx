import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function SuspendedStudio() {
  const location = useLocation();
  const type = (location.state as any)?.type || 'not_found';

  const getContent = () => {
    switch (type) {
      case 'suspended':
        return {
          icon: <ShieldAlert className="h-16 w-16 text-terracota" />,
          title: 'Acceso Suspendido',
          subtitle: 'Este estudio de yoga se encuentra temporalmente suspendido por el administrador de la plataforma.',
          description: 'Si eres el dueño del estudio, por favor ponte en contacto con soporte técnico de UIO Yoga para regularizar tu cuenta.'
        };
      case 'expired':
        return {
          icon: <CreditCard className="h-16 w-16 text-terracota" />,
          title: 'Suscripción Vencida',
          subtitle: 'La suscripción o período de prueba de este estudio de yoga ha finalizado.',
          description: 'Para renovar el servicio y recuperar el acceso a los horarios, clases y reservas, por favor realiza el pago de la membresía correspondiente.'
        };
      case 'not_found':
      default:
        return {
          icon: <RefreshCw className="h-16 w-16 text-salvia" />,
          title: 'Estudio no Encontrado',
          subtitle: 'El subdominio al que estás intentando acceder no está registrado en nuestra plataforma SaaS.',
          description: 'Verifica que hayas escrito la URL correctamente. Si deseas registrar tu propio estudio de yoga, ponte en contacto con la administración principal.'
        };
    }
  };

  const content = getContent();

  return (
    <div className="flex min-h-screen items-center justify-center bg-marfil px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-[32px] border-[8px] border-white bg-arena shadow-xl p-8 md:p-12 text-center flex flex-col items-center"
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/5 shadow-inner">
          {content.icon}
        </div>
        
        <h1 className="font-serif text-3xl md:text-4xl text-gris mb-3 font-semibold tracking-tight">
          {content.title}
        </h1>
        
        <p className="text-sm font-medium text-terracota mb-6 max-w-sm uppercase tracking-wider">
          {content.subtitle}
        </p>

        <p className="text-xs text-gris/60 leading-relaxed mb-8 max-w-md">
          {content.description}
        </p>

        <div className="flex gap-4 w-full justify-center">
          <Link to="/" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto rounded-full bg-salvia px-8 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-salvia/90 shadow-md">
              Ir al Inicio
            </Button>
          </Link>
          {type !== 'not_found' && (
            <a href="mailto:soporte@uioyoga.com" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto rounded-full border border-gris/20 px-8 py-3 text-xs font-bold uppercase tracking-widest text-gris hover:bg-white/10">
                Soporte
              </Button>
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
