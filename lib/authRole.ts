import { supabase } from "@/lib/supabase";

export async function getUserRole() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session?.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", sessionData.session.user.id)
    .single();

  return profile?.role ?? null;
}

export function redirectByRole(role: string) {
  if (role === "admin") return "/admin";
  if (role === "caseta") return "/caseta";
  if (role === "resident") return "/residente";
  return "/login";
}