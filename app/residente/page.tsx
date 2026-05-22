"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { createVisit } from "@/lib/visit";

type GeneratedVisit = {
  qrToken: string;
  visitorName: string;
  houseNumber: string;
  residentName: string;
  expiresAt: string;
};

export default function ResidentePage() {
  const [visitorName, setVisitorName] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [generatedVisit, setGeneratedVisit] = useState<GeneratedVisit | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateQR = async () => {
    setError("");
    setGeneratedVisit(null);

    if (!visitorName.trim() || !houseNumber.trim()) {
      setError("Completa el nombre del visitante y la casa antes de generar el código QR.");
      return;
    }

    try {
      setIsLoading(true);

      const result = await createVisit(houseNumber.trim(), visitorName.trim());

      setGeneratedVisit({
        qrToken: result.qrToken,
        visitorName: result.visit.visitor_name,
        houseNumber: result.house.house_number,
        residentName: result.house.resident_name,
        expiresAt: result.visit.expires_at,
      });
    } catch (error) {
      console.error(error);
      setError("No se pudo generar el QR. Verifica que la casa exista en Supabase.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <section className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-orange-400 font-semibold tracking-[0.3em] uppercase">
            JSMR Access
          </p>
          <h1 className="text-5xl font-black mt-3">Modo Residente</h1>
          <p className="text-neutral-400 mt-3">
            Genera códigos QR temporales para visitantes usando la base de datos de Supabase.
          </p>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-8 shadow-2xl space-y-6">
          <input
            type="text"
            placeholder="Nombre del visitante"
            value={visitorName}
            onChange={(event) => setVisitorName(event.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
          />

          <input
            type="text"
            placeholder="Casa registrada en Supabase. Ej. Casa 1"
            value={houseNumber}
            onChange={(event) => setHouseNumber(event.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
          />

          {error && (
            <div className="rounded-2xl bg-red-950 border border-red-800 p-4 text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={generateQR}
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-2xl py-4 font-bold text-lg"
          >
            {isLoading ? "Generando QR..." : "Generar Código QR"}
          </button>
        </div>

        {generatedVisit && (
          <div className="mt-10 bg-neutral-900 rounded-3xl p-8 shadow-2xl">
            <div className="bg-white rounded-3xl p-8 flex flex-col items-center">
              <QRCode value={generatedVisit.qrToken} size={260} />
              <p className="text-black mt-6 font-black text-xl text-center break-all">
                {generatedVisit.qrToken}
              </p>
              <p className="text-neutral-700 mt-2 text-center">
                QR válido por 3 horas y reutilizable durante su vigencia.
              </p>
            </div>

            <div className="mt-8 space-y-3 text-neutral-300">
              <p>
                <strong className="text-white">Visitante:</strong> {generatedVisit.visitorName}
              </p>
              <p>
                <strong className="text-white">Persona a visitar:</strong> {generatedVisit.residentName}
              </p>
              <p>
                <strong className="text-white">Casa:</strong> {generatedVisit.houseNumber}
              </p>
              <p>
                <strong className="text-white">Token:</strong> {generatedVisit.qrToken}
              </p>
              <p>
                <strong className="text-white">Expira:</strong>{" "}
                {new Date(generatedVisit.expiresAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}