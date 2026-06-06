// lib/auth.ts
import { supabase } from "./supabase";

// Automatically sync Supabase auth state to standard cookie for Next.js middleware
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      const maxAge = session.expires_in || 604800; // default to 7 days
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
    } else {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax${secure}`;
    }
  });
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(callback: (session: unknown) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
