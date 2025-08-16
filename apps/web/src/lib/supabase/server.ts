import { createClient, SupabaseClient } from '@supabase/supabase-js';

/** Minimal DB typing for tables we touch. Extend if needed. */
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      chats: {
        Row: { id: string; slug: string };
        Insert: { id?: string; slug: string };
        Update: Partial<{ id: string; slug: string }>;
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_address: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_address: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          chat_id: string;
          sender_address: string;
          body: string;
          created_at: string;
        }>;
      };
      contacts: {
        Row: {
          id: string;
          owner_address: string;
          contact_address: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_address: string;
          contact_address: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          owner_address: string;
          contact_address: string;
          created_at: string;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let cachedAdmin: SupabaseClient<Database> | null = null;

/**
 * Server-side Supabase admin client.
 * Requires:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE (server-only secret)
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cachedAdmin) return cachedAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase server credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE.'
    );
  }

  cachedAdmin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });

  return cachedAdmin;
}
