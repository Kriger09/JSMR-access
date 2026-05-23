"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Ingresa correo y contraseña.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setError("Correo o contraseña incorrectos.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("No se encontró un perfil válido.");
        return;
      }

      if (profile.role === "admin") {
        router.push("/admin");
        return;
      }

      if (profile.role === "caseta") {
        router.push("/caseta");
        return;
      }

      if (profile.role === "resident") {
        router.push("/residente");
        return;
      }

      setError("Rol no válido.");
    } catch {
      setError("Ocurrió un error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-6 overflow-hidden">
      <section className="relative max-w-6xl mx-auto min-h-[calc(100vh-3rem)] flex items-center justify-center">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-600/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-red-900/20 blur-3xl" />
          <div className="absolute bottom-24 left-10 h-56 w-56 rounded-full bg-yellow-600/10 blur-3xl" />
        </div>

        <div className="grid w-full max-w-5xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-10 items-center">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-300 shadow-2xl">
              Acceso seguro
            </div>

            <div className="mt-10 relative w-32 h-32 rounded-[2rem] bg-gradient-to-br from-orange-500 via-orange-700 to-red-950 flex items-center justify-center shadow-2xl border border-orange-300/20">
              <div className="absolute inset-0 rounded-[2rem] bg-orange-500 blur-2xl opacity-30" />
              <span className="relative text-4xl font-black tracking-tight">JSMR</span>
            </div>

            <p className="mt-8 uppercase tracking-[0.35em] text-orange-400 font-semibold text-sm">
              Fraccionamiento José María Sánchez Ramírez
            </p>

            <h1 className="mt-5 text-6xl font-black tracking-tight leading-none">
              Control de acceso inteligente
            </h1>

            <p className="mt-6 text-neutral-300 text-lg max-w-xl leading-relaxed">
              Ingresa al sistema para gestionar accesos, validar códigos QR y supervisar la operación del fraccionamiento.
            </p>
          </div>

          <div className="w-full max-w-md mx-auto">
            <section className="relative bg-neutral-900/90 border border-neutral-800 rounded-[2rem] p-6 md:p-8 shadow-2xl backdrop-blur-xl">
              <div className="absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-orange-400/70 to-transparent" />

              <div className="flex justify-center lg:hidden mb-6">
                <div className="relative w-24 h-24 rounded-[1.75rem] bg-gradient-to-br from-orange-500 via-orange-700 to-red-950 flex items-center justify-center shadow-2xl border border-orange-300/20">
                  <div className="absolute inset-0 rounded-[1.75rem] bg-orange-500 blur-2xl opacity-30" />
                  <span className="relative text-3xl font-black tracking-tight">JSMR</span>
                </div>
              </div>

              <p className="text-orange-400 font-semibold tracking-[0.3em] uppercase text-xs">
                JSMR Access
              </p>

              <h1 className="text-4xl md:text-5xl font-black mt-3 tracking-tight">
                Iniciar sesión
              </h1>

              <p className="text-neutral-400 mt-4 leading-relaxed text-sm md:text-base">
                Acceso exclusivo para residentes, caseta y administración autorizada.
              </p>

              <div className="mt-8 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="usuario@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-800/90 border border-neutral-700 rounded-2xl px-5 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleLogin();
                      }
                    }}
                    className="w-full bg-neutral-800/90 border border-neutral-700 rounded-2xl px-5 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  />
                </div>

                {error && (
                  <div className="bg-red-950/80 border border-red-800 text-red-200 rounded-2xl p-4 text-sm font-semibold">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="group w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl py-4 font-black text-lg transition-all active:scale-[0.99] shadow-2xl shadow-orange-950/40"
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-3">
                      <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Ingresando...
                    </span>
                  ) : (
                    <span>
                      Entrar al sistema
                      <span className="ml-3 inline-block transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  )}
                </button>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}