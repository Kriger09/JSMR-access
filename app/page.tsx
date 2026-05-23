import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-6 overflow-hidden">
      <section className="relative max-w-6xl mx-auto min-h-[calc(100vh-3rem)] flex items-center justify-center">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-600/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-red-900/20 blur-3xl" />
          <div className="absolute bottom-24 left-10 h-56 w-56 rounded-full bg-yellow-600/10 blur-3xl" />
        </div>

        <div className="w-full max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-[0.25em] text-orange-300 shadow-2xl">
            Control de acceso residencial
          </div>

          <div className="mt-10 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-orange-500 blur-2xl opacity-30" />
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-orange-500 via-orange-700 to-red-950 flex items-center justify-center shadow-2xl border border-orange-300/20">
                <span className="text-3xl md:text-4xl font-black tracking-tight">
                  JSMR
                </span>
              </div>
            </div>
          </div>

          <p className="mt-8 uppercase tracking-[0.35em] text-orange-400 font-semibold text-xs md:text-sm">
            Fraccionamiento José María Sánchez Ramírez
          </p>

          <h1 className="mt-5 text-5xl md:text-7xl lg:text-8xl font-black tracking-tight">
            JSMR Access
          </h1>

          <p className="mt-6 text-neutral-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Plataforma inteligente para registrar, validar y controlar accesos de visitantes mediante códigos QR seguros.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-xl">
              <p className="text-orange-400 text-sm font-black uppercase tracking-[0.2em]">
                Residentes
              </p>
              <p className="mt-2 text-neutral-300 text-sm leading-relaxed">
                Generación controlada de códigos QR con vigencia limitada.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-xl">
              <p className="text-orange-400 text-sm font-black uppercase tracking-[0.2em]">
                Caseta
              </p>
              <p className="mt-2 text-neutral-300 text-sm leading-relaxed">
                Validación rápida de entradas y registro operativo de accesos.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-xl">
              <p className="text-orange-400 text-sm font-black uppercase tracking-[0.2em]">
                Administración
              </p>
              <p className="mt-2 text-neutral-300 text-sm leading-relaxed">
                Supervisión de casas, usuarios, visitas e historial semanal.
              </p>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center rounded-2xl bg-orange-600 px-10 py-5 text-lg font-black text-white shadow-2xl shadow-orange-950/40 transition-all hover:bg-orange-500 active:scale-95"
            >
              Iniciar sesión
              <span className="ml-3 transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          <p className="mt-6 text-neutral-500 text-sm">
            Acceso exclusivo para usuarios autorizados del sistema.
          </p>
        </div>
      </section>
    </main>
  );
}