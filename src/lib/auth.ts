// src/lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { supabase } from "./supabase";

export const auth = () => getServerSession(authOptions);

// Export Supabase auth instance for client-side use
export const getSupabaseAuth = () => supabase.auth;
