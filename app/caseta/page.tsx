"use client";

import { useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { registerAccessLog, validateVisit } from "@/lib/visit";

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

const getHouseData = (visit: VisitWithHouse): HouseData | null => {
  if (!visit.houses) return null;

  if (Array.isArray(visit.houses)) {
    return visit.houses[0] ?? null;
  }

  return visit.houses;
};

export default function CasetaPage() {
  const [scanResult, setScanResult] = useState("");
  const [visitorData, setVisitorData] = useState<VisitWithHouse | null>(null);
  const [status, setStatus] = useState<"" | "active" | "expired" | "invalid" | "cancelled">("");
  const [accessLogs, setAccessLogs] = useState<AccessLogView[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const clearScanner = async () => {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.clear();
    } catch (error) {
      console.error(error);
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const startScanner = () => {
    setErrorMessage("");
    setVisitorData(null);
    setStatus("");
    setScanResult("");

    if (scannerRef.current) {
      return;
    }

    setIsScanning(true);

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: 250,
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        const token = decodedText.trim();
        setScanResult(token);

        const visit = (await validateVisit(token)) as VisitWithHouse | null;

        if (!visit) {
          setVisitorData(null);
          setStatus("invalid");
          setErrorMessage("El código escaneado no existe en Supabase o no pertenece al sistema JSMR Access.");
          await clearScanner();
          return;
        }

        setVisitorData(visit);

        const now = new Date();
        const expiresAt = new Date(visit.expires_at);

        if (visit.status === "cancelled") {
          setStatus("cancelled");
        } else if (now > expiresAt) {
          setStatus("expired");
        } else {
          setStatus("active");
        }

        await clearScanner();
      },
      () => {}
    );
  };

  const registerAccess = async (action: "approved" | "rejected") => {
    if (!visitorData) return;

    const house = getHouseData(visitorData);

    try {
      setIsRegistering(true);

      const savedLog = await registerAccessLog(
        visitorData.id,
        visitorData.house_id,
        action
      );

      const newLog: AccessLogView = {
        id: savedLog.id,
        visitorName: visitorData.visitor_name,
        houseNumber: house?.house_number ?? "Casa no identificada",
        personToVisit: house?.resident_name ?? "Residente no identificado",
        action,
        scannedAt: savedLog.scanned_at,
      };

      setAccessLogs((prev) => [newLog, ...prev]);

      alert(
        action === "approved"
          ? "Entrada aprobada y registrada en Supabase."
          : "Entrada rechazada y registrada en Supabase."
      );

      setVisitorData(null);
      setStatus("");
      setScanResult("");
      setErrorMessage("");
    } catch (error) {
      console.error(error);
      alert("No se pudo registrar el acceso en Supabase.");
    } finally {
      setIsRegistering(false);
    }
  };

  const house = visitorData ? getHouseData(visitorData) : null;

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-6 md:px-6 md:py-12">
      <section className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-10">
          <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
            JSMR Access
          </p>
          <h1 className="text-4xl md:text-5xl font-black mt-3">Modo Caseta</h1>
          <p className="text-neutral-400 mt-3 text-sm md:text-base">
            Escanea el QR del visitante, valida su estado y registra la decisión de acceso.
          </p>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-5 md:p-8 shadow-2xl border border-neutral-800">
          <button
            onClick={startScanner}
            disabled={isScanning}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-2xl py-5 font-black text-xl"
          >
            {isScanning ? "Escáner activo..." : "Escanear QR"}
          </button>

          {scanResult && (
            <div className="mt-5 rounded-2xl bg-neutral-800 border border-neutral-700 p-4 text-neutral-300 text-sm break-all">
              <strong className="text-white">Token:</strong> {scanResult}
            </div>
          )}

          <div id="reader" className="mt-6 bg-white rounded-2xl p-3 text-black overflow-hidden" />
        </div>

        {visitorData && (
          <div className="mt-6 md:mt-10 bg-neutral-900 rounded-3xl p-5 md:p-8 shadow-2xl border border-neutral-800">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Información del visitante</h2>

            <div className="space-y-4 text-neutral-300 text-base md:text-lg">
              <p>
                <strong className="text-white">Visitante:</strong> {visitorData.visitor_name}
              </p>
              <p>
                <strong className="text-white">Persona a visitar:</strong>{" "}
                {house?.resident_name ?? "Residente no identificado"}
              </p>
              <p>
                <strong className="text-white">Casa:</strong>{" "}
                {house?.house_number ?? "Casa no identificada"}
              </p>
              <p>
                <strong className="text-white">Creado:</strong>{" "}
                {new Date(visitorData.created_at).toLocaleString()}
              </p>
              <p>
                <strong className="text-white">Expira:</strong>{" "}
                {new Date(visitorData.expires_at).toLocaleString()}
              </p>
              <p>
                <strong className="text-white">Estado del sistema:</strong>{" "}
                <span
                  className={
                    status === "active"
                      ? "text-green-400 font-bold"
                      : status === "expired" || status === "cancelled"
                        ? "text-red-400 font-bold"
                        : "text-yellow-400 font-bold"
                  }
                >
                  {status === "active"
                    ? "Acceso válido"
                    : status === "expired"
                      ? "QR vencido"
                      : status === "cancelled"
                        ? "QR cancelado"
                        : "Revisión requerida"}
                </span>
              </p>
            </div>

            {status === "active" && (
              <div className="mt-8 rounded-2xl bg-green-950 border border-green-700 p-5 text-center">
                <p className="font-black text-green-200 text-xl">QR ACTIVO</p>
                <p className="text-green-300 mt-1">Puede aprobarse la entrada si los datos coinciden.</p>
              </div>
            )}

            {status === "expired" && (
              <div className="mt-8 rounded-2xl bg-red-950 border border-red-800 p-5 text-center">
                <p className="font-black text-red-200 text-xl">QR VENCIDO</p>
                <p className="text-red-300 mt-1">No permitir acceso. Registra el rechazo si es necesario.</p>
              </div>
            )}

            {status === "cancelled" && (
              <div className="mt-8 rounded-2xl bg-red-950 border border-red-800 p-5 text-center">
                <p className="font-black text-red-200 text-xl">QR CANCELADO</p>
                <p className="text-red-300 mt-1">No permitir acceso. Este QR fue cancelado desde administración.</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => registerAccess("approved")}
                disabled={status === "expired" || status === "cancelled" || isRegistering}
                className="bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl py-5 text-lg font-black"
              >
                Aprobar entrada
              </button>

              <button
                onClick={() => registerAccess("rejected")}
                disabled={isRegistering}
                className="bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl py-5 text-lg font-black"
              >
                Registrar rechazo
              </button>
            </div>
          </div>
        )}

        {status === "invalid" && (
          <div className="mt-6 md:mt-10 bg-red-950 border border-red-800 rounded-3xl p-6 md:p-8 text-center">
            <h2 className="text-3xl font-black">QR inválido</h2>
            <p className="text-red-100 mt-2">
              {errorMessage || "El código escaneado no existe en Supabase o no pertenece al sistema JSMR Access."}
            </p>
          </div>
        )}

        {accessLogs.length > 0 && (
          <div className="mt-6 md:mt-10 bg-neutral-900 rounded-3xl p-5 md:p-8 shadow-2xl border border-neutral-800">
            <h2 className="text-3xl font-bold mb-6">Historial de accesos</h2>

            <div className="space-y-4">
              {accessLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-neutral-800 rounded-2xl p-5 border border-neutral-700"
                >
                  <p>
                    <strong>Visitante:</strong> {log.visitorName}
                  </p>
                  <p>
                    <strong>Casa:</strong> {log.houseNumber}
                  </p>
                  <p>
                    <strong>Persona a visitar:</strong> {log.personToVisit}
                  </p>
                  <p>
                    <strong>Hora:</strong> {new Date(log.scannedAt).toLocaleString()}
                  </p>
                  <p
                    className={
                      log.action === "approved"
                        ? "text-green-400 font-bold"
                        : "text-red-400 font-bold"
                    }
                  >
                    {log.action === "approved" ? "Entrada aprobada" : "Entrada rechazada"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}