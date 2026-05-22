"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [houses, setHouses] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [houseSearch, setHouseSearch] = useState("");
  const [visitSearch, setVisitSearch] = useState("");

  const [houseNumber, setHouseNumber] = useState("");
  const [residentName, setResidentName] = useState("");
  const [residentPhone, setResidentPhone] = useState("");
  const [editingHouseId, setEditingHouseId] = useState<string | null>(null);
  const [editingResidentName, setEditingResidentName] = useState("");
  const [editingResidentPhone, setEditingResidentPhone] = useState("");

  const loadData = async () => {
    const { data: housesData } = await supabase
      .from("houses")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: visitsData } = await supabase
      .from("visits")
      .select("*, houses(house_number, resident_name)")
      .order("created_at", { ascending: false });

    const { data: logsData } = await supabase
      .from("access_logs")
      .select("*, houses(house_number, resident_name), visits(visitor_name, qr_token)")
      .order("scanned_at", { ascending: false });

    setHouses(housesData ?? []);
    setVisits(visitsData ?? []);
    setLogs(logsData ?? []);
  };

  const addHouse = async () => {
    if (!houseNumber || !residentName) return;

    await supabase.from("houses").insert([
      {
        house_number: houseNumber,
        resident_name: residentName,
        resident_phone: residentPhone || null,
      },
    ]);

    setHouseNumber("");
    setResidentName("");
    setResidentPhone("");

    loadData();
  };

  const toggleHouseStatus = async (houseId: string, currentStatus: boolean) => {
    await supabase
      .from("houses")
      .update({ active: !currentStatus })
      .eq("id", houseId);

    loadData();
  };

  const deleteHouse = async (houseId: string, houseNumber: string) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar ${houseNumber}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("houses")
      .delete()
      .eq("id", houseId);

    if (error) {
      alert(
        "No se pudo eliminar la casa porque puede tener visitas o accesos relacionados. Puedes desactivarla en su lugar."
      );
      return;
    }

    loadData();
  };

  const startEditingHouse = (house: any) => {
    setEditingHouseId(house.id);
    setEditingResidentName(house.resident_name ?? "");
    setEditingResidentPhone(house.resident_phone ?? "");
  };

  const updateHouseResident = async (houseId: string) => {
    if (!editingResidentName.trim()) {
      alert("El nombre del residente no puede estar vacío.");
      return;
    }

    const { error } = await supabase
      .from("houses")
      .update({
        resident_name: editingResidentName.trim(),
        resident_phone: editingResidentPhone.trim() || null,
      })
      .eq("id", houseId);

    if (error) {
      alert("No se pudo actualizar la información del residente.");
      return;
    }

    setEditingHouseId(null);
    setEditingResidentName("");
    setEditingResidentPhone("");

    loadData();
  };

  const cancelVisit = async (visitId: string) => {
    const confirmed = window.confirm(
      "¿Seguro que deseas cancelar este QR? La caseta ya no debería permitir el acceso."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("visits")
      .update({ status: "cancelled" })
      .eq("id", visitId);

    if (error) {
      alert("No se pudo cancelar el QR.");
      return;
    }

    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredHouses = houses.filter((house) => {
    const search = houseSearch.toLowerCase().trim();

    if (!search) return true;

    const houseNumber = String(house.house_number ?? "").toLowerCase();
    const resident = String(house.resident_name ?? "").toLowerCase();

    return houseNumber.includes(search) || resident.includes(search);
  });

  const filteredVisits = visits.filter((visit) => {
    const search = visitSearch.toLowerCase().trim();

    if (!search) return true;

    const visitor = String(visit.visitor_name ?? "").toLowerCase();
    const houseNumber = String(visit.houses?.house_number ?? "").toLowerCase();
    const resident = String(visit.houses?.resident_name ?? "").toLowerCase();

    return (
      visitor.includes(search) ||
      houseNumber.includes(search) ||
      resident.includes(search)
    );
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-6 py-10">
      <section className="max-w-6xl mx-auto space-y-10">
        <div>
          <p className="text-orange-400 font-semibold tracking-[0.3em] uppercase">
            JSMR Access
          </p>
          <h1 className="text-5xl font-black mt-3">Panel Admin</h1>
          <p className="text-neutral-400 mt-3">
            Administración de casas, visitas y accesos.
          </p>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">Agregar casa</h2>

          <input
            placeholder="Casa. Ej. Casa 4"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            className="w-full bg-neutral-800 rounded-2xl px-4 py-3"
          />

          <input
            placeholder="Nombre del residente"
            value={residentName}
            onChange={(e) => setResidentName(e.target.value)}
            className="w-full bg-neutral-800 rounded-2xl px-4 py-3"
          />

          <input
            placeholder="Teléfono del residente"
            value={residentPhone}
            onChange={(e) => setResidentPhone(e.target.value)}
            className="w-full bg-neutral-800 rounded-2xl px-4 py-3"
          />

          <button
            onClick={addHouse}
            className="w-full bg-orange-600 rounded-2xl py-4 font-bold"
          >
            Guardar casa
          </button>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Casas registradas</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Busca por número de casa o nombre del residente.
              </p>
            </div>

            <input
              placeholder="Buscar casa o residente..."
              value={houseSearch}
              onChange={(e) => setHouseSearch(e.target.value)}
              className="w-full md:max-w-sm bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div className="mb-4 text-sm text-neutral-400">
            Mostrando {filteredHouses.length} de {houses.length} casas.
          </div>

          <div className="space-y-3">
            {filteredHouses.map((house) => (
              <div key={house.id} className="bg-neutral-800 rounded-2xl p-4 space-y-3">
                <div>
                  <p><strong>Casa:</strong> {house.house_number}</p>

                  {editingHouseId === house.id ? (
                    <div className="mt-3 space-y-3">
                      <input
                        placeholder="Nombre del residente"
                        value={editingResidentName}
                        onChange={(e) => setEditingResidentName(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
                      />

                      <input
                        placeholder="Teléfono del residente"
                        value={editingResidentPhone}
                        onChange={(e) => setEditingResidentPhone(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
                      />
                    </div>
                  ) : (
                    <>
                      <p><strong>Residente:</strong> {house.resident_name}</p>
                      <p><strong>Teléfono:</strong> {house.resident_phone ?? "Sin teléfono"}</p>
                    </>
                  )}

                  <p>
                    <strong>Estado:</strong>{" "}
                    <span className={house.active ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                      {house.active ? "Activa" : "Inactiva"}
                    </span>
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {editingHouseId === house.id ? (
                    <>
                      <button
                        onClick={() => updateHouseResident(house.id)}
                        className="w-full bg-orange-600 hover:bg-orange-500 rounded-2xl py-3 font-bold transition-all"
                      >
                        Guardar cambios
                      </button>

                      <button
                        onClick={() => {
                          setEditingHouseId(null);
                          setEditingResidentName("");
                          setEditingResidentPhone("");
                        }}
                        className="w-full bg-neutral-700 hover:bg-neutral-600 rounded-2xl py-3 font-bold transition-all"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditingHouse(house)}
                        className="w-full bg-orange-700 hover:bg-orange-600 rounded-2xl py-3 font-bold transition-all"
                      >
                        Editar residente
                      </button>

                      <button
                        onClick={() => toggleHouseStatus(house.id, house.active)}
                        className={
                          house.active
                            ? "w-full bg-red-800 hover:bg-red-700 rounded-2xl py-3 font-bold transition-all"
                            : "w-full bg-green-700 hover:bg-green-600 rounded-2xl py-3 font-bold transition-all"
                        }
                      >
                        {house.active ? "Desactivar casa" : "Activar casa"}
                      </button>

                      <button
                        onClick={() => deleteHouse(house.id, house.house_number)}
                        className="md:col-span-2 w-full bg-neutral-700 hover:bg-neutral-600 rounded-2xl py-3 font-bold transition-all"
                      >
                        Eliminar casa
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredHouses.length === 0 && (
              <div className="bg-neutral-800 rounded-2xl p-6 text-neutral-400 text-center">
                No se encontraron casas con esa búsqueda.
              </div>
            )}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold">Visitas generadas</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Busca por visitante, casa o residente.
              </p>
            </div>

            <input
              placeholder="Buscar visita..."
              value={visitSearch}
              onChange={(e) => setVisitSearch(e.target.value)}
              className="w-full md:max-w-sm bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div className="mb-4 text-sm text-neutral-400">
            Mostrando {filteredVisits.length} de {visits.length} visitas.
          </div>

          <div className="space-y-3">
            {filteredVisits.map((visit) => {
              const isExpired = new Date() > new Date(visit.expires_at);
              const isCancelled = visit.status === "cancelled";

              return (
                <div key={visit.id} className="bg-neutral-800 rounded-2xl p-4 space-y-3">
                  <div>
                    <p><strong>Visitante:</strong> {visit.visitor_name}</p>
                    <p><strong>Casa:</strong> {visit.houses?.house_number}</p>
                    <p><strong>Residente:</strong> {visit.houses?.resident_name}</p>
                    <p>
                      <strong>Estado:</strong>{" "}
                      <span
                        className={
                          isCancelled
                            ? "text-red-400 font-bold"
                            : isExpired
                              ? "text-yellow-400 font-bold"
                              : "text-green-400 font-bold"
                        }
                      >
                        {isCancelled ? "Cancelado" : isExpired ? "Vencido" : "Activo"}
                      </span>
                    </p>
                    <p><strong>Expira:</strong> {new Date(visit.expires_at).toLocaleString()}</p>
                  </div>

                  <button
                    onClick={() => cancelVisit(visit.id)}
                    disabled={isCancelled}
                    className="w-full bg-red-800 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl py-3 font-bold transition-all"
                  >
                    {isCancelled ? "QR cancelado" : "Cancelar QR"}
                  </button>
                </div>
              );
            })}

            {filteredVisits.length === 0 && (
              <div className="bg-neutral-800 rounded-2xl p-6 text-neutral-400 text-center">
                No se encontraron visitas con esa búsqueda.
              </div>
            )}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-3xl p-8">
          <h2 className="text-2xl font-bold mb-4">Historial de accesos</h2>

          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-neutral-800 rounded-2xl p-4">
                <p><strong>Visitante:</strong> {log.visits?.visitor_name}</p>
                <p><strong>Casa:</strong> {log.houses?.house_number}</p>
                <p><strong>Acción:</strong> {log.action}</p>
                <p><strong>Hora:</strong> {new Date(log.scanned_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}