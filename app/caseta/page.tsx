"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { registerAccessLog, validateVisit } from "@/lib/visit";
import AppNavbar from "@/components/AppNavbar";

type HouseData = {
  resident_name: string;
  house_number: string;
};

type VisitWithHouse = {
  id: string;
  house_id: string;
  visitor_name: string;
  qr_token: string;
  status: string;
  created_at: string;
  expires_at: string;
  houses: HouseData | HouseData[] | null;
};

type AccessLogView = {
  id: string;
  visitorName: string;
  houseNumber: string;
  personToVisit: string;
  action: "approved" | "rejected";
  scannedAt: string;
};

type AccessLogRow = {
  id: string;
  action: "approved" | "rejected";
  scanned_at: string;
  visits: {
    visitor_name: string;
  } | {
    visitor_name: string;
  }[] | null;
  houses: HouseData | HouseData[] | null;
};

const getHouseData = (visit: VisitWithHouse): HouseData | null => {
  if (!visit.houses) return null;

  if (Array.isArray(visit.houses)) {
    return visit.houses[0] ?? null;
  }

  return visit.houses;
};

export default function CasetaPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState("");
  const [visitorData, setVisitorData] = useState<VisitWithHouse | null>(null);
  const [status, setStatus] = useState<"" | "active" | "expired" | "invalid" | "cancelled">("");
  const [accessLogs, setAccessLogs] = useState<AccessLogView[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanCooldownRef = useRef(false);
  const lastScannedTokenRef = useRef("");

  const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const playTone = (frequency: number, duration: number) => {
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass = window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0.18, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration / 1000);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn("Audio feedback unavailable:", error);
    }
  };

  const successFeedback = () => {
    vibrate(120);
    playTone(880, 140);
  };

  const warningFeedback = () => {
    vibrate([160, 80, 160]);
    playTone(520, 180);
    setTimeout(() => playTone(420, 180), 220);
  };

  const errorFeedback = () => {
    vibrate([250, 100, 250]);
    playTone(220, 260);
  };

  const loadAccessLogs = async () => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const { data, error } = await supabase
      .from("access_logs")
      .select(`
        id,
        action,
        scanned_at,
        visits(visitor_name),
        houses(resident_name, house_number)
      `)
      .gte("scanned_at", startOfWeek.toISOString())
      .order("scanned_at", { ascending: false });

    if (error || !data) {
      console.error(error);
      return;
    }

    const mappedLogs: AccessLogView[] = (data as AccessLogRow[]).map((log) => {
      const visit = Array.isArray(log.visits) ? log.visits[0] : log.visits;
      const house = Array.isArray(log.houses) ? log.houses[0] : log.houses;

      return {
        id: log.id,
        visitorName: visit?.visitor_name ?? "Visitante no identificado",
        houseNumber: house?.house_number ?? "Casa no identificada",
        personToVisit: house?.resident_name ?? "Residente no identificado",
        action: log.action,
        scannedAt: log.scanned_at,
      };
    });

    setAccessLogs(mappedLogs);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (profile.role !== "caseta") {
        if (profile.role === "admin") {
          router.replace("/admin");
          return;
        }

        if (profile.role === "resident") {
          router.replace("/residente");
          return;
        }

        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      await loadAccessLogs();
      setIsCheckingSession(false);
    };

    checkSession();
  }, [router]);

  const resetScannerState = () => {
    setVisitorData(null);
    setStatus("");
    setScanResult("");
    setActionMessage("");
    setErrorMessage("");
  };

  const clearScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) return;

    try {
      await scanner.stop();
    } catch (error) {
      console.warn("Scanner already stopped:", error);
    }

    try {
      scanner.clear();
    } catch (error) {
      console.warn("Scanner could not be cleared:", error);
    }

    scannerRef.current = null;
    setIsScanning(false);
  };

  const startScanner = async () => {
    setErrorMessage("");
    setVisitorData(null);
    setStatus("");
    setScanResult("");
    setActionMessage("");

    if (scannerRef.current) {
      return;
    }

    setIsScanning(true);

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          const token = decodedText.trim();

          if (scanCooldownRef.current) {
            return;
          }

          if (lastScannedTokenRef.current === token) {
            return;
          }

          scanCooldownRef.current = true;
          lastScannedTokenRef.current = token;

          setScanResult(token);

          const visit = (await validateVisit(token)) as VisitWithHouse | null;

          if (!visit) {
            errorFeedback();
            setVisitorData(null);
            setStatus("invalid");
            setErrorMessage("El código escaneado no existe en Supabase o no pertenece al sistema JSMR Access.");

            setTimeout(async () => {
              await clearScanner();
              resetScannerState();
              scanCooldownRef.current = false;
              lastScannedTokenRef.current = "";
            }, 2500);

            return;
          }

          setVisitorData(visit);

          const now = new Date();
          const expiresAt = new Date(visit.expires_at);

          if (visit.status === "cancelled") {
            warningFeedback();
            setStatus("cancelled");
          } else if (now > expiresAt) {
            warningFeedback();
            setStatus("expired");
          } else {
            successFeedback();
            setStatus("active");
          }

          setTimeout(async () => {
            await clearScanner();
            scanCooldownRef.current = false;
            lastScannedTokenRef.current = "";
          }, 2500);
        },
        () => {}
      );
    } catch (error) {
      console.error(error);
      errorFeedback();
      setErrorMessage("No se pudo abrir la cámara trasera. Revisa permisos de cámara o prueba desde el celular.");
      setStatus("invalid");
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const registerAccess = async (action: "approved" | "rejected") => {
    if (!visitorData) return;

    try {
      setIsRegistering(true);

      await registerAccessLog(
        visitorData.id,
        visitorData.house_id,
        action
      );

      await loadAccessLogs();

      if (action === "approved") {
        successFeedback();
      } else {
        warningFeedback();
      }

      resetScannerState();

      setActionMessage(
        action === "approved"
          ? "✅ Entrada aprobada y registrada correctamente"
          : "❌ Rechazo registrado correctamente"
      );

      scanCooldownRef.current = false;
      lastScannedTokenRef.current = "";
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar el acceso en Supabase.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center">
          <p className="text-orange-400 font-semibold tracking-[0.3em] uppercase text-sm">
            JSMR Access
          </p>
          <p className="text-neutral-300 mt-4">Verificando sesión...</p>
        </div>
      </main>
    );
  }

  const house = visitorData ? getHouseData(visitorData) : null;

  const statusPanel = (() => {
    if (status === "active") {
      return {
        title: "ACCESO VÁLIDO",
        subtitle: "Los datos coinciden. Puede aprobarse la entrada.",
        icon: "✓",
        containerClass: "bg-green-950 border-green-600 text-green-100",
        iconClass: "bg-green-500 text-green-950",
      };
    }

    if (status === "expired") {
      return {
        title: "QR VENCIDO",
        subtitle: "No permitir acceso. El código ya expiró.",
        icon: "!",
        containerClass: "bg-yellow-950 border-yellow-600 text-yellow-100",
        iconClass: "bg-yellow-400 text-yellow-950",
      };
    }

    if (status === "cancelled") {
      return {
        title: "QR CANCELADO",
        subtitle: "No permitir acceso. Este código fue cancelado por el residente.",
        icon: "×",
        containerClass: "bg-red-950 border-red-700 text-red-100",
        iconClass: "bg-red-500 text-red-950",
      };
    }

    if (status === "invalid") {
      return {
        title: "QR INVÁLIDO",
        subtitle: errorMessage || "El código no pertenece al sistema JSMR Access.",
        icon: "×",
        containerClass: "bg-red-950 border-red-800 text-red-100",
        iconClass: "bg-red-500 text-red-950",
      };
    }

    return null;
  })();

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 pt-6 pb-28 md:px-6 md:py-12">
      <section className="max-w-5xl mx-auto space-y-6">
        <AppNavbar
          title="Modo Caseta"
          role="caseta"
        />

        <div className="relative overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900 p-5 md:p-8 shadow-2xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-600/20 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-red-900/20 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Operación de acceso
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-black tracking-tight">
                Caseta
              </h1>
              <p className="mt-3 text-neutral-400 max-w-2xl leading-relaxed">
                Escanea códigos QR, valida visitantes y registra entradas o rechazos en tiempo real.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-4 text-left md:text-right">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Cámara
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {isScanning ? "Activa" : "Lista"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-[2rem] p-5 md:p-8 shadow-2xl border border-neutral-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Scanner QR
              </p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">
                Validación de visitante
              </h2>
              <p className="text-neutral-500 text-sm mt-2">
                Usa la cámara trasera para leer el código presentado en caseta.
              </p>
            </div>

            <button
              onClick={startScanner}
              disabled={isScanning}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-2xl px-8 py-4 font-black text-lg shadow-2xl shadow-orange-950/40 active:scale-95"
            >
              {isScanning ? "Escáner activo..." : "Escanear QR"}
            </button>
          </div>

          {scanResult && (
            <div className="mt-5 rounded-2xl bg-neutral-800 border border-neutral-700 p-4 text-neutral-300 text-sm break-all">
              <strong className="text-white">Token:</strong> {scanResult}
            </div>
          )}

          <div className="relative mt-6 overflow-hidden rounded-[2rem] border border-neutral-700 bg-neutral-950 p-3">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-orange-500/10 via-transparent to-red-900/10" />
            <div id="reader" className="relative bg-white rounded-2xl p-3 text-black overflow-hidden min-h-[260px]" />
          </div>
        </div>

        {statusPanel && (
          <div className={`rounded-[2rem] border-2 p-8 md:p-12 shadow-2xl text-center ${statusPanel.containerClass}`}>
            <div className={`mx-auto w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-6xl md:text-7xl font-black shadow-2xl ${statusPanel.iconClass}`}>
              {statusPanel.icon}
            </div>

            <h2 className="mt-8 text-4xl md:text-7xl font-black tracking-tight">
              {statusPanel.title}
            </h2>

            <p className="mt-4 text-xl md:text-3xl font-semibold opacity-90">
              {statusPanel.subtitle}
            </p>

            {visitorData && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="rounded-2xl bg-black/20 border border-white/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] opacity-70 font-bold">
                    Visitante
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {visitorData.visitor_name}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/20 border border-white/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] opacity-70 font-bold">
                    Casa
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {house?.house_number ?? "No identificada"}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/20 border border-white/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] opacity-70 font-bold">
                    Residente
                  </p>
                  <p className="mt-2 text-2xl font-black">
                    {house?.resident_name ?? "No identificado"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {actionMessage && (
          <div className="bg-neutral-900 border border-orange-500/30 rounded-[2rem] px-6 py-6 text-center text-xl md:text-2xl font-black text-white shadow-2xl shadow-orange-950/20">
            {actionMessage}
          </div>
        )}

        {visitorData && (
          <div className="bg-neutral-900 rounded-[2rem] p-5 md:p-8 shadow-2xl border border-neutral-800">
            <div className="mb-6">
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Resultado del escaneo
              </p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">
                Información del visitante
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-neutral-300 text-base">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                  Visitante
                </p>
                <p className="mt-2 text-white text-xl font-black">
                  {visitorData.visitor_name}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                  Persona a visitar
                </p>
                <p className="mt-2 text-white text-xl font-black">
                  {house?.resident_name ?? "Residente no identificado"}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                  Casa
                </p>
                <p className="mt-2 text-white text-xl font-black">
                  {house?.house_number ?? "Casa no identificada"}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                  Estado
                </p>
                <p
                  className={
                    status === "active"
                      ? "mt-2 text-green-400 text-xl font-black"
                      : status === "expired" || status === "cancelled"
                        ? "mt-2 text-red-400 text-xl font-black"
                        : "mt-2 text-yellow-400 text-xl font-black"
                  }
                >
                  {status === "active"
                    ? "Acceso válido"
                    : status === "expired"
                      ? "QR vencido"
                      : status === "cancelled"
                        ? "QR cancelado"
                        : "Revisión requerida"}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                  Creado
                </p>
                <p className="mt-2 text-white font-semibold">
                  {new Date(visitorData.created_at).toLocaleString()}
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                  Expira
                </p>
                <p className="mt-2 text-white font-semibold">
                  {new Date(visitorData.expires_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => registerAccess("approved")}
                disabled={status === "expired" || status === "cancelled" || isRegistering}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl py-5 text-lg font-black shadow-xl active:scale-95 transition-all"
              >
                Aprobar entrada
              </button>

              <button
                onClick={() => registerAccess("rejected")}
                disabled={isRegistering}
                className="bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl py-5 text-lg font-black shadow-xl active:scale-95 transition-all"
              >
                Registrar rechazo
              </button>
            </div>
          </div>
        )}

        {accessLogs.length > 0 && (
          <div className="bg-neutral-900 rounded-[2rem] p-5 md:p-8 shadow-2xl border border-neutral-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                  Caseta
                </p>
                <h2 className="text-2xl md:text-3xl font-black mt-1">
                  Historial semanal
                </h2>
              </div>

              <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-3 text-center">
                <p className="text-sm text-neutral-400 font-semibold uppercase tracking-[0.2em]">
                  Registros
                </p>
                <p className="text-2xl font-black text-white mt-1">
                  {accessLogs.length}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-neutral-800 rounded-2xl border border-neutral-700 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-xl font-black text-white">
                      {log.visitorName}
                    </p>

                    <div className="flex flex-wrap gap-2 text-sm text-neutral-400 font-semibold">
                      <span>
                        Casa {log.houseNumber}
                      </span>

                      <span className="text-neutral-600">•</span>

                      <span>
                        {log.personToVisit}
                      </span>
                    </div>

                    <p className="text-sm text-neutral-500 font-medium">
                      {new Date(log.scannedAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm md:text-base font-black border ${
                        log.action === "approved"
                          ? "bg-green-950 border-green-700 text-green-300"
                          : "bg-red-950 border-red-700 text-red-300"
                      }`}
                    >
                      {log.action === "approved"
                        ? "✓ Aprobado"
                        : "✕ Rechazado"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}