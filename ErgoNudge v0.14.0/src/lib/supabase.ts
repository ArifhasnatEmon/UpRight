import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      upright_profiles: {
        Row: {
          email: string;
          name: string | null;
          xp: number;
          level: number;
          achievements: unknown[]; // JSONB
          settings: Record<string, unknown> | null; // JSONB — AppSettings snapshot
          avatar_url: string | null; // Supabase Storage public URL (optional)
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['upright_profiles']['Row'], 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['upright_profiles']['Insert']>;
      };
      upright_logs: {
        Row: {
          id: number;
          email: string;
          timestamp: string;
          score: number;
          state: string;
          duration: number;
        };
        Insert: Database['public']['Tables']['upright_logs']['Row'];
        Update: Partial<Database['public']['Tables']['upright_logs']['Insert']>;
      };
      upright_sessions: {
        Row: {
          id: number;
          email: string;
          start_time: string;
          end_time: string | null;
          avg_score: number;
          duration: number;
        };
        Insert: Database['public']['Tables']['upright_sessions']['Row'];
        Update: Partial<Database['public']['Tables']['upright_sessions']['Insert']>;
      };
      upright_break_logs: {
        Row: {
          id: number;
          email: string;
          type: string;
          timestamp: string;
        };
        Insert: Database['public']['Tables']['upright_break_logs']['Row'];
        Update: Partial<Database['public']['Tables']['upright_break_logs']['Insert']>;
      };
    };
  };
}

// Returns null when env vars are missing — callers guard with `if (!supabase) return`
// so the app works 100% offline with zero Supabase configuration.
function createSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !key) {
    // No Supabase configured — cloud sync simply won't activate
    return null;
  }

  return createClient<Database>(url, key, {
    auth: {
      // ErgoNudge uses its own email-based identity, not Supabase Auth.
      // Disable auto-session management to avoid unexpected token refreshes.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabase: SupabaseClient<Database> | null = createSupabaseClient();
