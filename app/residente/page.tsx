"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createVisit } from "@/lib/visit";
import AppNavbar from "@/components/AppNavbar";

type GeneratedVisit = {
  qrToken: string;
  visitorName: string;
  houseNumber: string;
  residentName: string;
  expiresAt: string;
};

type ResidentHouse = {
  id: string;
  house_number: string;
  resident_name: string;
};


type HouseVisit = {
  id: string;
  visitor_name: string;
  status: string;
  created_at: string;
  expires_at: string;
};

type ResidentDevice = {
  id: string;
  house_id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  is_active: boolean;
  created_at: string;
  last_seen_at: string;
};

export default function ResidentePage() {
  const router = useRouter();
  const [visitorName, setVisitorName] = useState("");
  const [residentHouse, setResidentHouse] = useState<ResidentHouse | null>(null);
  const [generatedVisit, setGeneratedVisit] = useState<GeneratedVisit | null>(null);
  const [houseVisits, setHouseVisits] = useState<HouseVisit[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [deviceStatus, setDeviceStatus] = useState<"checking" | "authorized" | "blocked">("checking");
  const qrWrapperRef = useRef<HTMLDivElement | null>(null);

  const getOrCreateDeviceId = () => {
    const storageKey = "jsmr_resident_device_id";
    const existingDeviceId = window.localStorage.getItem(storageKey);

    if (existingDeviceId) {
      return existingDeviceId;
    }

    const newDeviceId = crypto.randomUUID();
    window.localStorage.setItem(storageKey, newDeviceId);
    return newDeviceId;
  };

  const buildQrImageBlob = async () => {
    if (!generatedVisit || !qrWrapperRef.current) return null;

    const svg = qrWrapperRef.current.querySelector("svg");

    if (!svg) return null;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.src = svgUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No se pudo generar la imagen del QR."));
    });

    const logo = new Image();
    logo.src = "/icon-192.png";

    await new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve();
    });

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1180;

    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(svgUrl);
      return null;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (logo.complete && logo.naturalWidth > 0) {
      context.drawImage(logo, canvas.width / 2 - 70, 35, 150, 80);
    }

    context.fillStyle = "#111111";
    context.font = "bold 42px Arial";
    context.textAlign = "center";
    context.fillText("JMSR Access", canvas.width / 2, 165);

    context.font = "bold 34px Arial";
    context.fillText("Código QR de visitante", canvas.width / 2, 225);

    context.drawImage(image, 220, 285, 460, 460);

    context.fillStyle = "#222222";
    context.font = "bold 30px Arial";
    context.fillText(generatedVisit.visitorName, canvas.width / 2, 825);

    context.font = "24px Arial";
    context.fillText(`Casa: ${generatedVisit.houseNumber}`, canvas.width / 2, 875);
    context.fillText(`Residente: ${generatedVisit.residentName}`, canvas.width / 2, 920);
    context.fillText(
      `Expira: ${new Date(generatedVisit.expiresAt).toLocaleString()}`,
      canvas.width / 2,
      965
    );

    context.fillStyle = "#555555";
    context.font = "20px Arial";
    context.fillText("Presenta este código en caseta para validar el acceso.", canvas.width / 2, 1045);
    context.font = "18px Arial";
    context.fillText("El visitante deberá identificarse en caseta.", canvas.width / 2, 1085);

    URL.revokeObjectURL(svgUrl);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const downloadQR = async () => {
    const blob = await buildQrImageBlob();

    if (!blob || !generatedVisit) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-${generatedVisit.visitorName}-${generatedVisit.houseNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareQR = async () => {
    const blob = await buildQrImageBlob();

    if (!blob || !generatedVisit) return;

    const file = new File(
      [blob],
      `qr-${generatedVisit.visitorName}-${generatedVisit.houseNumber}.png`,
      { type: "image/png" }
    );

    const shareData = {
      title: "Código QR de visitante - JMSR Access",
      text: `QR de acceso para ${generatedVisit.visitorName}, casa ${generatedVisit.houseNumber}.`,
      files: [file],
    };

    if (navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return;
    }

    await downloadQR();
  };

  const loadHouseVisits = async (houseId: string) => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const { data, error } = await supabase
      .from("visits")
      .select("id, visitor_name, status, created_at, expires_at")
      .eq("house_id", houseId)
      .gte("created_at", startOfWeek.toISOString())
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error(error);
      return;
    }

    setHouseVisits(data as HouseVisit[]);
  };

  const verifyResidentDevice = async (houseId: string, userId: string) => {
    const deviceId = getOrCreateDeviceId();
    const deviceName = navigator.userAgent;

    const { data: existingDevice, error: existingDeviceError } = await supabase
      .from("resident_devices")
      .select("id, house_id, user_id, device_id, device_name, is_active, created_at, last_seen_at")
      .eq("house_id", houseId)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (existingDeviceError) {
      console.error(existingDeviceError);
      setError("No se pudo verificar este dispositivo. Intenta nuevamente.");
      setDeviceStatus("blocked");
      return false;
    }

    if (existingDevice) {
      const savedDevice = existingDevice as ResidentDevice;

      if (!savedDevice.is_active) {
        setError("Este dispositivo no está activo para esta casa. Contacta al administrador.");
        setDeviceStatus("blocked");
        return false;
      }

      const { error: updateDeviceError } = await supabase
        .from("resident_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", savedDevice.id);

      if (updateDeviceError) {
        console.error(updateDeviceError);
      }

      setDeviceStatus("authorized");
      return true;
    }

    const { count, error: countError } = await supabase
      .from("resident_devices")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("is_active", true);

    if (countError) {
      console.error(countError);
      setError("No se pudo consultar el límite de dispositivos. Intenta nuevamente.");
      setDeviceStatus("blocked");
      return false;
    }

    if ((count ?? 0) >= 3) {
      setError("Esta casa ya alcanzó el límite de 3 dispositivos autorizados. Solicita al administrador desactivar un dispositivo anterior.");
      setDeviceStatus("blocked");
      return false;
    }

    const { error: insertDeviceError } = await supabase
      .from("resident_devices")
      .insert({
        house_id: houseId,
        user_id: userId,
        device_id: deviceId,
        device_name: deviceName,
        is_active: true,
      });

    if (insertDeviceError) {
      console.error(insertDeviceError);
      setError("No se pudo registrar este dispositivo. Verifica el límite de dispositivos o los permisos en Supabase.");
      setDeviceStatus("blocked");
      return false;
    }

    setDeviceStatus("authorized");
    return true;
  };

  const cancelVisit = async (visitId: string) => {
    if (!residentHouse) return;

    const confirmCancel = window.confirm(
      "¿Seguro que deseas cancelar este código QR? Una vez cancelado, caseta ya no podrá aprobar el acceso."
    );

    if (!confirmCancel) return;

    const { error } = await supabase
      .from("visits")
      .update({ status: "cancelled" })
      .eq("id", visitId)
      .eq("house_id", residentHouse.id);

    if (error) {
      console.error(error);
      setError("No se pudo cancelar el código QR. Revisa los permisos RLS en Supabase.");
      return;
    }

    await loadHouseVisits(residentHouse.id);

    if (generatedVisit) {
      setGeneratedVisit(null);
    }
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
        .select("role, house_id")
        .eq("id", data.session.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (profile.role !== "resident") {
        if (profile.role === "admin") {
          router.replace("/admin");
          return;
        }

        if (profile.role === "caseta") {
          router.replace("/caseta");
          return;
        }

        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (!profile.house_id) {
        setError("Tu usuario residente todavía no tiene una casa vinculada. Contacta al administrador.");
        setIsCheckingSession(false);
        return;
      }

      const { data: house, error: houseError } = await supabase
        .from("houses")
        .select("id, house_number, resident_name")
        .eq("id", profile.house_id)
        .single();

      if (houseError || !house) {
        setError("No se encontró la casa vinculada a tu usuario. Contacta al administrador.");
        setIsCheckingSession(false);
        return;
      }

      const isDeviceAuthorized = await verifyResidentDevice(house.id, data.session.user.id);

      if (!isDeviceAuthorized) {
        setResidentHouse(house as ResidentHouse);
        setIsCheckingSession(false);
        return;
      }

      setResidentHouse(house as ResidentHouse);
      await loadHouseVisits(house.id);

      setIsCheckingSession(false);
    };

    checkSession();
  }, [router]);


  const generateQR = async () => {
    setError("");
    setGeneratedVisit(null);

    if (!visitorName.trim()) {
      setError("Completa el nombre del visitante antes de generar el código QR.");
      return;
    }

    if (!residentHouse) {
      setError("No hay una casa vinculada a tu usuario residente.");
      return;
    }

    const activeQrCount = houseVisits.filter((visit) => {
      const isExpired = new Date() > new Date(visit.expires_at);
      const isCancelled = visit.status === "cancelled";
      return !isExpired && !isCancelled;
    }).length;

    if (activeQrCount >= 20) {
      setError("Has alcanzado el límite máximo de 20 códigos QR activos para esta casa. Cancela algún QR activo o espera a que expire antes de generar uno nuevo.");
      return;
    }

    try {
      setIsLoading(true);

      const result = await createVisit(residentHouse.house_number, visitorName.trim());

      setGeneratedVisit({
        qrToken: result.qrToken,
        visitorName: result.visit.visitor_name,
        houseNumber: result.house.house_number,
        residentName: result.house.resident_name,
        expiresAt: result.visit.expires_at,
      });
      await loadHouseVisits(residentHouse.id);
    } catch (error) {
      console.error(error);
      setError("No se pudo generar el QR. Verifica que tu casa esté correctamente vinculada en Supabase.");
    } finally {
      setIsLoading(false);
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

  if (deviceStatus === "blocked") {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md bg-neutral-900 border border-red-800 rounded-[2rem] p-8 text-center shadow-2xl">
          <div className="mx-auto w-20 h-20 rounded-[1.5rem] bg-red-950 border border-red-800 flex items-center justify-center text-4xl font-black text-red-300">
            !
          </div>

          <p className="text-red-400 font-semibold tracking-[0.3em] uppercase text-sm mt-6">
            Dispositivo bloqueado
          </p>

          <h1 className="text-3xl font-black mt-3">
            Límite de dispositivos alcanzado
          </h1>

          <p className="text-neutral-300 mt-4 leading-relaxed">
            {error || "Esta casa ya alcanzó el límite de 3 dispositivos autorizados."}
          </p>

          <p className="text-neutral-500 text-sm mt-4 leading-relaxed">
            Para acceder desde este equipo, solicita al administrador desactivar un dispositivo anterior asociado a la casa.
          </p>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            className="mt-6 w-full bg-red-800 hover:bg-red-700 rounded-2xl py-4 font-black transition-all active:scale-95"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 md:px-6 pt-6 pb-28 md:pb-6">
      <section className="max-w-5xl mx-auto space-y-6">
        <AppNavbar
          title="Modo Residente"
          role="resident"
        />

        <div className="relative overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900 p-5 md:p-8 shadow-2xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-600/20 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-red-900/20 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Accesos residenciales
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-black tracking-tight">
                Residente
              </h1>
              <p className="mt-3 text-neutral-400 max-w-2xl leading-relaxed">
                Genera códigos QR temporales para tus visitantes, compártelos y consulta el historial semanal de tu casa.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-4 text-left md:text-right">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Casa vinculada
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                {residentHouse?.house_number ?? "Sin casa"}
              </p>
              <p className="mt-2 inline-flex items-center justify-center rounded-full border border-green-700 bg-green-950 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-green-300">
                Dispositivo autorizado
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-5 md:p-6 shadow-2xl space-y-5">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Nuevo acceso
              </p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">
                Generar QR de visitante
              </h2>
              <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                El código se genera para tu casa vinculada, tiene vigencia fija de 3 horas y permite hasta 20 QR activos por casa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">
                Nombre del visitante
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={visitorName}
                onChange={(event) => setVisitorName(event.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-2xl px-5 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div className="bg-neutral-800/80 border border-neutral-700 rounded-2xl px-5 py-5">
              <p className="text-neutral-400 text-xs font-black uppercase tracking-[0.2em]">
                Casa vinculada
              </p>
              {residentHouse ? (
                <div className="mt-3">
                  <p className="text-white font-black text-3xl">
                    {residentHouse.house_number}
                  </p>
                  <p className="text-neutral-400 mt-1">
                    Residente: {residentHouse.resident_name}
                  </p>
                </div>
              ) : (
                <p className="text-red-300 mt-2">
                  No hay casa vinculada a este usuario.
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-2xl bg-red-950/80 border border-red-800 p-4 text-red-200 text-sm font-semibold">
                {error}
              </div>
            )}

            <button
              onClick={generateQR}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-2xl py-4 font-black text-lg shadow-2xl shadow-orange-950/40 active:scale-95"
            >
              {isLoading ? (
                <span className="inline-flex items-center justify-center gap-3">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Generando QR...
                </span>
              ) : (
                "Generar Código QR"
              )}
            </button>
          </div>

          <div className="space-y-6">
            {generatedVisit ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-5 md:p-6 shadow-2xl">
                <div className="mb-5 rounded-2xl border border-yellow-700 bg-yellow-950/60 p-4 text-yellow-100">
                  <p className="font-black uppercase tracking-[0.2em] text-sm text-yellow-300">
                    Aviso importante
                  </p>
                  <p className="mt-2 text-sm md:text-base leading-relaxed">
                    Al otorgar permiso de acceso al visitante, el residente acepta la responsabilidad por daños, incidentes o situaciones en las que el visitante pudiera verse involucrado dentro del fraccionamiento. El visitante deberá identificarse en la caseta para validar su entrada.
                  </p>
                </div>

                <div className="mb-5">
                  <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                    Código generado
                  </p>
                  <h2 className="text-2xl md:text-3xl font-black mt-1">
                    QR listo para compartir
                  </h2>
                  <p className="text-neutral-400 text-sm mt-2">
                    Vigencia fija: 3 horas. Comparte o descarga el código para enviarlo al visitante.
                  </p>
                </div>

                <div
                  ref={qrWrapperRef}
                  className="bg-white rounded-[2rem] p-6 flex flex-col items-center shadow-2xl"
                >
                  <QRCode value={generatedVisit.qrToken} size={260} />
                  <p className="text-black mt-6 font-black text-lg text-center break-all max-w-full">
                    {generatedVisit.qrToken}
                  </p>
                  <p className="text-neutral-700 mt-2 text-center font-semibold">
                    QR válido durante 3 horas.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-neutral-300">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                    <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                      Visitante
                    </p>
                    <p className="mt-2 text-white font-black">
                      {generatedVisit.visitorName}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                    <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                      Persona a visitar
                    </p>
                    <p className="mt-2 text-white font-black">
                      {generatedVisit.residentName}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                    <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                      Casa
                    </p>
                    <p className="mt-2 text-white font-black">
                      {generatedVisit.houseNumber}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                    <p className="text-neutral-500 text-xs font-black uppercase tracking-[0.2em]">
                      Expira
                    </p>
                    <p className="mt-2 text-white font-black">
                      {new Date(generatedVisit.expiresAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={shareQR}
                    className="bg-orange-600 hover:bg-orange-500 transition-all rounded-2xl py-4 font-black text-lg shadow-xl active:scale-95"
                  >
                    Compartir QR
                  </button>

                  <button
                    onClick={downloadQR}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-all rounded-2xl py-4 font-black text-lg active:scale-95"
                  >
                    Descargar PNG
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 shadow-2xl text-center min-h-[320px] flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-[1.5rem] bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-4xl font-black text-orange-300">
                  QR
                </div>
                <h2 className="mt-6 text-2xl font-black">
                  Aún no hay QR generado
                </h2>
                <p className="mt-2 text-neutral-400 max-w-sm text-sm leading-relaxed">
                  Ingresa el nombre del visitante y genera un código para compartirlo o descargarlo.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-5 md:p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Historial
              </p>
              <h2 className="text-2xl md:text-3xl font-black mt-1">
                Visitas de mi casa
              </h2>
              <p className="text-neutral-400 text-sm mt-1">
                Códigos generados durante la semana actual.
              </p>
            </div>

            <button
              onClick={() => residentHouse && loadHouseVisits(residentHouse.id)}
              className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-2xl px-5 py-3 font-bold transition-all active:scale-95"
            >
              Actualizar
            </button>
          </div>

          {houseVisits.length === 0 ? (
            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-5 text-neutral-400 text-sm text-center">
              Todavía no hay visitas registradas esta semana.
            </div>
          ) : (
            <div className="space-y-3">
              {houseVisits.map((visit) => {
                const isExpired = new Date() > new Date(visit.expires_at);
                const isCancelled = visit.status === "cancelled";

                const label = isCancelled
                  ? "Cancelado"
                  : isExpired
                    ? "Vencido"
                    : "Activo";

                const labelClass = isCancelled
                  ? "text-red-300 bg-red-950 border-red-800"
                  : isExpired
                    ? "text-yellow-300 bg-yellow-950 border-yellow-800"
                    : "text-green-300 bg-green-950 border-green-800";

                return (
                  <div
                    key={visit.id}
                    className="bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <p className="text-white font-black text-xl">
                        {visit.visitor_name}
                      </p>
                      <div className="mt-2 flex flex-col md:flex-row md:flex-wrap gap-1 md:gap-3 text-neutral-400 text-sm font-semibold">
                        <span>
                          Generado: {new Date(visit.created_at).toLocaleString()}
                        </span>
                        <span className="hidden md:inline text-neutral-600">•</span>
                        <span>
                          Expira: {new Date(visit.expires_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-3">
                      <span className={`border rounded-full px-5 py-2.5 text-sm font-black ${labelClass}`}>
                        {label}
                      </span>

                      {!isExpired && !isCancelled && (
                        <button
                          onClick={() => cancelVisit(visit.id)}
                          className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95"
                        >
                          Cancelar QR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}