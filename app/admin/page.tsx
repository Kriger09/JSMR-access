"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppNavbar from "@/components/AppNavbar";

export default function AdminPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [houses, setHouses] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [houseSearch, setHouseSearch] = useState("");
  const [visitSearch, setVisitSearch] = useState("");
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileRole, setEditingProfileRole] = useState("");
  const [editingProfileHouseId, setEditingProfileHouseId] = useState("");

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

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email, role, house_id")
      .order("email", { ascending: true });

    setHouses(housesData ?? []);
    setVisits(visitsData ?? []);
    setLogs(logsData ?? []);
    setProfiles(profilesData ?? []);
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

  const startEditingProfile = (profile: any) => {
    setEditingProfileId(profile.id);
    setEditingProfileRole(profile.role ?? "resident");
    setEditingProfileHouseId(profile.house_id ?? "");
  };

  const updateProfile = async (profileId: string) => {
    if (!editingProfileRole) {
      alert("Selecciona un rol para el usuario.");
      return;
    }

    const nextHouseId = editingProfileRole === "resident"
      ? editingProfileHouseId || null
      : null;

    const { error } = await supabase
      .from("profiles")
      .update({
        role: editingProfileRole,
        house_id: nextHouseId,
      })
      .eq("id", profileId);

    if (error) {
      alert("No se pudo actualizar el usuario. Revisa las políticas RLS de profiles.");
      return;
    }

    setEditingProfileId(null);
    setEditingProfileRole("");
    setEditingProfileHouseId("");

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

      if (profile.role !== "admin") {
        if (profile.role === "caseta") {
          router.replace("/caseta");
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

      await loadData();
      setIsCheckingSession(false);
    };

    checkSession();
  }, [router]);

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

  const activeHousesCount = houses.filter((house) => house.active).length;

  const activeVisitsCount = visits.filter((visit) => {
    const isExpired = new Date() > new Date(visit.expires_at);
    const isCancelled = visit.status === "cancelled";

    return !isExpired && !isCancelled;
  }).length;

  const expiredVisitsCount = visits.filter((visit) => {
    const isExpired = new Date() > new Date(visit.expires_at);
    const isCancelled = visit.status === "cancelled";

    return isExpired && !isCancelled;
  }).length;

  const totalAccessLogsCount = logs.length;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayLogs = logs.filter((log) => {
    if (!log.scanned_at) return false;
    return new Date(log.scanned_at) >= todayStart;
  });

  const approvedTodayCount = todayLogs.filter((log) => log.action === "approved").length;
  const rejectedTodayCount = todayLogs.filter((log) => log.action === "rejected").length;

  const approvalRateToday = todayLogs.length > 0
    ? Math.round((approvedTodayCount / todayLogs.length) * 100)
    : 0;

  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const weeklyLogs = logs.filter((log) => {
    if (!log.scanned_at) return false;
    return new Date(log.scanned_at) >= startOfWeek;
  });

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

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 md:px-6 pt-6 pb-28 md:pb-6">
      <section className="max-w-6xl mx-auto space-y-6">
        <AppNavbar
          title="Panel Admin"
          role="admin"
        />

        <div className="relative overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900 p-5 md:p-8 shadow-2xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-600/20 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-red-900/20 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Centro de control
              </p>
              <h1 className="mt-3 text-4xl md:text-6xl font-black tracking-tight">
                Administración
              </h1>
              <p className="mt-3 text-neutral-400 max-w-2xl leading-relaxed">
                Supervisa casas, usuarios, códigos QR, accesos registrados y actividad operativa del fraccionamiento.
              </p>
            </div>

            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-4 text-left md:text-right">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Estado del sistema
              </p>
              <p className="mt-2 text-2xl font-black text-white">
                Operativo
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="group relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl hover:border-orange-500/40 transition-all">
            <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
              Casas activas
            </p>
            <p className="text-4xl font-black mt-3 text-green-400">
              {activeHousesCount}
            </p>
            <p className="text-neutral-500 text-sm mt-2">
              De {houses.length} casas registradas.
            </p>
          </div>

          <div className="group relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl hover:border-orange-500/40 transition-all">
            <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
              Visitas activas
            </p>
            <p className="text-4xl font-black mt-3 text-orange-400">
              {activeVisitsCount}
            </p>
            <p className="text-neutral-500 text-sm mt-2">
              QR vigentes y no cancelados.
            </p>
          </div>

          <div className="group relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl hover:border-orange-500/40 transition-all">
            <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
              QR vencidos
            </p>
            <p className="text-4xl font-black mt-3 text-yellow-400">
              {expiredVisitsCount}
            </p>
            <p className="text-neutral-500 text-sm mt-2">
              Visitas expiradas sin cancelar.
            </p>
          </div>

          <div className="group relative overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl hover:border-orange-500/40 transition-all">
            <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
              Accesos registrados
            </p>
            <p className="text-4xl font-black mt-3 text-sky-400">
              {totalAccessLogsCount}
            </p>
            <p className="text-neutral-500 text-sm mt-2">
              Escaneos guardados en caseta.
            </p>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Analytics
              </p>
              <h2 className="text-2xl font-black mt-1">Actividad de hoy</h2>
              <p className="text-neutral-400 text-sm mt-1">
                Resumen operativo de accesos registrados por caseta durante el día.
              </p>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 text-center">
              <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
                Aprobación
              </p>
              <p className="text-4xl font-black text-green-400 mt-1">
                {approvalRateToday}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4">
              <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
                Accesos hoy
              </p>
              <p className="text-4xl font-black mt-2 text-white">
                {todayLogs.length}
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                Total de registros capturados hoy.
              </p>
            </div>

            <div className="bg-green-950 border border-green-800 rounded-2xl p-4">
              <p className="text-green-300 text-sm font-semibold uppercase tracking-[0.2em]">
                Aprobados
              </p>
              <p className="text-4xl font-black mt-2 text-green-200">
                {approvedTodayCount}
              </p>
              <p className="text-green-400 text-sm mt-2">
                Entradas autorizadas por caseta.
              </p>
            </div>

            <div className="bg-red-950 border border-red-800 rounded-2xl p-4">
              <p className="text-red-300 text-sm font-semibold uppercase tracking-[0.2em]">
                Rechazados
              </p>
              <p className="text-4xl font-black mt-2 text-red-200">
                {rejectedTodayCount}
              </p>
              <p className="text-red-400 text-sm mt-2">
                Accesos no autorizados o rechazados.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-2xl p-5 space-y-3">
          <h2 className="text-xl font-bold">Agregar casa</h2>

          <input
            placeholder="Casa. Ej. Casa 4"
            value={houseNumber}
            onChange={(e) => setHouseNumber(e.target.value)}
            className="w-full bg-neutral-800 rounded-xl px-4 py-2.5"
          />

          <input
            placeholder="Nombre del residente"
            value={residentName}
            onChange={(e) => setResidentName(e.target.value)}
            className="w-full bg-neutral-800 rounded-xl px-4 py-2.5"
          />

          <input
            placeholder="Teléfono del residente"
            value={residentPhone}
            onChange={(e) => setResidentPhone(e.target.value)}
            className="w-full bg-neutral-800 rounded-xl px-4 py-2.5"
          />

          <button
            onClick={addHouse}
            className="w-full bg-orange-600 rounded-xl py-3 font-bold"
          >
            Guardar casa
          </button>
        </div>

        <div className="bg-neutral-900 rounded-2xl p-5">
          <div className="mb-6">
            <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
              Administración
            </p>
            <h2 className="text-xl font-bold mt-1">Usuarios y vinculación</h2>
            <p className="text-neutral-400 text-sm mt-1">
              Asigna roles y vincula usuarios residentes con una casa registrada.
            </p>
          </div>

          {profiles.length === 0 ? (
            <div className="bg-neutral-800 rounded-2xl p-6 text-neutral-400 text-center">
              No hay usuarios registrados en profiles.
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const linkedHouse = houses.find((house) => house.id === profile.house_id);
                const isEditing = editingProfileId === profile.id;

                return (
                  <div key={profile.id} className="bg-neutral-800 rounded-xl p-4 space-y-3">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
                          Usuario
                        </p>
                        <p className="font-bold mt-1 break-all">
                          {profile.email ?? "Sin correo"}
                        </p>
                      </div>

                      <div>
                        <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
                          Rol
                        </p>
                        {isEditing ? (
                          <select
                            value={editingProfileRole}
                            onChange={(e) => setEditingProfileRole(e.target.value)}
                            className="w-full mt-2 bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
                          >
                            <option value="admin">admin</option>
                            <option value="caseta">caseta</option>
                            <option value="resident">resident</option>
                          </select>
                        ) : (
                          <p className="font-bold mt-1 text-orange-300">
                            {profile.role ?? "Sin rol"}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-neutral-400 text-sm font-semibold uppercase tracking-[0.2em]">
                          Casa vinculada
                        </p>
                        {isEditing ? (
                          <select
                            value={editingProfileHouseId}
                            onChange={(e) => setEditingProfileHouseId(e.target.value)}
                            disabled={editingProfileRole !== "resident"}
                            className="w-full mt-2 bg-neutral-900 border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl px-4 py-3 outline-none focus:border-orange-500"
                          >
                            <option value="">Sin casa vinculada</option>
                            {houses.map((house) => (
                              <option key={house.id} value={house.id}>
                                {house.house_number} — {house.resident_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="font-bold mt-1">
                            {linkedHouse
                              ? `${linkedHouse.house_number} — ${linkedHouse.resident_name}`
                              : "Sin casa vinculada"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => updateProfile(profile.id)}
                            className="w-full bg-orange-600 hover:bg-orange-500 rounded-2xl py-3 font-bold transition-all"
                          >
                            Guardar usuario
                          </button>

                          <button
                            onClick={() => {
                              setEditingProfileId(null);
                              setEditingProfileRole("");
                              setEditingProfileHouseId("");
                            }}
                            className="w-full bg-neutral-700 hover:bg-neutral-600 rounded-2xl py-3 font-bold transition-all"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditingProfile(profile)}
                          className="md:col-span-2 w-full bg-orange-700 hover:bg-orange-600 rounded-2xl py-3 font-bold transition-all"
                        >
                          Editar usuario
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-neutral-900 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold">Casas registradas</h2>
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
              <div key={house.id} className="bg-neutral-800 rounded-xl p-4 space-y-3">
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

        <div className="bg-neutral-900 rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold">Visitas generadas</h2>
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
                <div key={visit.id} className="bg-neutral-800 rounded-xl p-4 space-y-3">
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

        <div className="bg-neutral-900 rounded-2xl p-5 border border-neutral-800 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-orange-400 font-semibold tracking-[0.25em] uppercase text-sm">
                Administración
              </p>
              <h2 className="text-2xl font-black mt-1">Historial semanal de accesos</h2>
              <p className="text-neutral-400 text-sm mt-2">
                Actividad registrada por caseta durante la semana actual.
              </p>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-5 py-4 text-center">
              <p className="text-sm text-neutral-400 font-semibold uppercase tracking-[0.2em]">
                Registros
              </p>
              <p className="text-3xl font-black text-white mt-1">
                {weeklyLogs.length}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {weeklyLogs.map((log) => (
              <div
                key={log.id}
                className="bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="text-lg font-black text-white">
                    {log.visits?.visitor_name ?? "Visitante desconocido"}
                  </p>

                  <div className="flex flex-wrap gap-2 text-sm text-neutral-400 font-semibold">
                    <span>
                      Casa {log.houses?.house_number ?? "Sin casa"}
                    </span>

                    <span className="text-neutral-600">•</span>

                    <span>
                      {log.houses?.resident_name ?? "Sin residente"}
                    </span>
                  </div>

                  <p className="text-sm text-neutral-500 font-medium">
                    {new Date(log.scanned_at).toLocaleString()}
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

            {weeklyLogs.length === 0 && (
              <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-6 text-center text-neutral-400">
                No hay accesos registrados esta semana.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}