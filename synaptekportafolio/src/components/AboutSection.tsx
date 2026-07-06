export function AboutSection() {
  return (
    <section id="sobre-nosotros" className="py-24 relative overflow-hidden bg-[var(--ink-900)]">
      {/* BACKGROUND IMAGE CON OVERLAY */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("/images/fondo.png")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[var(--ink-900)] via-transparent to-[var(--ink-900)] pointer-events-none"></div>

      <div className="wrap max-w-7xl mx-auto px-6 relative z-10">
        <div className="section-head text-center mb-16 mx-auto max-w-3xl">
          <span className="eyebrow text-[var(--ochre)] font-bold tracking-[0.2em] uppercase text-xs">Sobre nosotros</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-white leading-tight">Transformamos el caos operativo en sistemas eficientes</h2>
          <p className="text-gray-300 max-w-3xl mx-auto text-lg leading-relaxed">Entendemos que una barbería no opera igual que una sastrería. Por eso, en Napsi Tek no vendemos plantillas rígidas. Creamos páginas web y sistemas a la medida que resuelven tu problema real.</p>
        </div>
        <div className="problem-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="problem-card bg-[var(--ink-800)] p-8 rounded-2xl border border-white/10 hover:border-white/30 transition-colors">
            <span className="num text-[var(--moss)] text-2xl font-bold mb-4 block">01</span>
            <h3 className="text-xl font-bold text-white mb-3">Sistemas a tu Medida</h3>
            <p className="text-gray-400 leading-relaxed">Construimos lo que realmente necesitas. Si requieres que tus clientes agenden citas, compren en línea o necesitas gestionar tu inventario, lo hacemos posible.</p>
          </div>
          <div className="problem-card bg-[var(--ink-800)] p-8 rounded-2xl border border-white/10 hover:border-white/30 transition-colors">
            <span className="num text-[var(--moss)] text-2xl font-bold mb-4 block">02</span>
            <h3 className="text-xl font-bold text-white mb-3">Automatización y Optimización</h3>
            <p className="text-gray-400 leading-relaxed">Conectamos tus sistemas existentes (CRM, WhatsApp, bases de datos) para eliminar tareas repetitivas y procesar información automáticamente.</p>
          </div>
          <div className="problem-card bg-[var(--ink-800)] p-8 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors">
            <span className="num text-[var(--moss)] text-2xl font-bold mb-4 block">03</span>
            <h3 className="text-xl font-bold text-white mb-3">Soporte y Evolución Continua</h3>
            <p className="text-gray-400 leading-relaxed">Acompañamos tu crecimiento adaptando la infraestructura y el código a medida que surgen nuevos retos en tu negocio.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
