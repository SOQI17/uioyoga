import { motion } from 'framer-motion';

export function About() {
  return (
    <div className="bg-marfil min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4 md:px-12">
        <div className="max-w-3xl mx-auto text-center mb-24">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota"
          >
            Filosofía
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-serif text-5xl md:text-6xl font-medium text-gris mb-8"
          >
            Nuestra Historia
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="h-[2px] w-12 bg-salvia mx-auto mb-10"
          />
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-gris/70 leading-relaxed font-light"
          >
            UIO Yoga nació del deseo de crear un espacio donde la práctica física se encuentra con el crecimiento espiritual,
            en un ambiente diseñado para inspirar calma, elegancia y conexión profunda.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="relative aspect-square md:aspect-[4/5] rounded-[40px] overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 border-[12px] border-white/50 rounded-[40px] z-10 pointer-events-none"></div>
            <img 
              src="https://images.unsplash.com/photo-1599901860904-17e08c3a4cb1?q=80&w=2070&auto=format&fit=crop" 
              alt="Yoga Studio" 
              className="object-cover w-full h-full scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-8"
          >
            <div>
              <span className="block text-[10px] font-bold tracking-[0.3em] uppercase text-terracota mb-3">El Origen</span>
              <h2 className="font-serif text-4xl font-medium text-gris">La chispa inicial</h2>
            </div>
            
            <div className="space-y-6 text-gris/70 leading-relaxed font-light text-lg">
              <p>
                Fundada en 2024, UIO Yoga comenzó como un pequeño grupo de practicantes buscando algo más que una clase de fitness. Buscábamos una comunidad.
              </p>
              <p>
                El nombre "UIO" representa el despertar de la consciencia y la transformación continua que experimentamos sobre el mat. Nuestra arquitectura y diseño están pensados para eliminar distracciones y enfocarnos en el ser.
              </p>
            </div>

            <div className="pt-6 border-t border-arena">
               <p className="font-serif italic text-xl text-gris/80">"El yoga no se trata de tocarte los dedos de los pies, es lo que aprendes en el camino hacia abajo."</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
