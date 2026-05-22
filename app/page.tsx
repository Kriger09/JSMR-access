import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">

      <section className="max-w-5xl w-full">

        {/* HEADER */}
        <div className="text-center mb-16">

          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-500 to-red-900 flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-black">JSMR</span>
            </div>
          </div>

          <p className="uppercase tracking-[0.4em] text-orange-400 font-semibold">
            Fraccionamiento José María Sánchez Ramírez
          </p>

          <h1 className="text-6xl md:text-7xl font-black mt-5">
            JSMR Access
          </h1>

          <p className="text-neutral-400 mt-6 text-lg max-w-2xl mx-auto">
            Plataforma inteligente para el control y registro de visitantes
            mediante códigos QR seguros.
          </p>
        </div>

        {/* BUTTONS */}
        <div className="grid md:grid-cols-3 gap-6">

          <Link
            href="/login"
            className="bg-orange-600 hover:bg-orange-500 transition-all rounded-3xl p-10 text-center shadow-xl"
          >
            <h2 className="text-2xl font-bold">
              Iniciar Sesión
            </h2>

            <p className="text-orange-100 mt-3">
              Acceso para residentes y administración.
            </p>
          </Link>

          <Link
            href="/residente"
            className="bg-neutral-800 hover:bg-neutral-700 transition-all rounded-3xl p-10 text-center shadow-xl"
          >
            <h2 className="text-2xl font-bold">
              Modo Residente
            </h2>

            <p className="text-neutral-300 mt-3">
              Genera códigos QR para visitantes.
            </p>
          </Link>

          <Link
            href="/caseta"
            className="bg-red-900 hover:bg-red-800 transition-all rounded-3xl p-10 text-center shadow-xl"
          >
            <h2 className="text-2xl font-bold">
              Modo Caseta
            </h2>

            <p className="text-red-100 mt-3">
              Escanea y valida accesos en tiempo real.
            </p>
          </Link>

        </div>

      </section>

    </main>
  );
}