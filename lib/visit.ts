import { supabase } from "./supabase";

const createQRToken = () => {
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  const timePart = Date.now().toString(36).toUpperCase();

  return `JSMR-${randomPart}-${timePart}`;
};

export const createVisit = async (
  houseNumber: string,
  visitorName: string
) => {
  const { data: house, error: houseError } = await supabase
    .from("houses")
    .select("*")
    .eq("house_number", houseNumber)
    .eq("active", true)
    .single();

  if (houseError || !house) {
    throw new Error("La casa no existe o no está activa.");
  }

  const qrToken = createQRToken();

  const expiresAt = new Date(
    Date.now() + 3 * 60 * 60 * 1000
  ).toISOString();

  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .insert([
      {
        house_id: house.id,
        visitor_name: visitorName,
        qr_token: qrToken,
        expires_at: expiresAt,
      },
    ])
    .select()
    .single();

  if (visitError) {
    throw visitError;
  }

  return {
    visit,
    house,
    qrToken,
  };
};

export const validateVisit = async (qrToken: string) => {
  const { data, error } = await supabase
    .from("visits")
    .select(
      `
      *,
      houses (
        resident_name,
        house_number
      )
    `
    )
    .eq("qr_token", qrToken)
    .single();

  if (error || !data) {
    console.error(error);
    return null;
  }

  return data;
};

export const registerAccessLog = async (
  visitId: string,
  houseId: string,
  action: "approved" | "rejected",
  guardName = "Caseta JSMR"
) => {
  const { data, error } = await supabase
    .from("access_logs")
    .insert([
      {
        visit_id: visitId,
        house_id: houseId,
        action,
        guard_name: guardName,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};