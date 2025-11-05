import { createClient } from "@supabase/supabase-js";
import { readGlobal as readCountAPI, incrementGlobal as hitCountAPI } from "@/lib/counter";

// These will be environment variables in production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isSupabaseConfigured() {
    return (
        SUPABASE_URL &&
        SUPABASE_ANON_KEY &&
        !SUPABASE_URL.includes("your-project") &&
        SUPABASE_ANON_KEY !== "your-anon-key"
    );
}

// Real-time strike counter hook
export async function getGlobalStrikes(): Promise<number> {
    if (!isSupabaseConfigured()) {
        // Fallback to CountAPI in dev/unconfigured environments
        const val = await readCountAPI();
        return typeof val === "number" ? val : 0;
    }
    try {
        const { data, error } = await supabase
            .from("global_strikes")
            .select("count")
            .single();

        if (error) throw error;
        return data?.count ?? 0;
    } catch {
        return 0;
    }
}

export async function incrementGlobalStrikes(): Promise<number | null> {
    if (!isSupabaseConfigured()) {
        const val = await hitCountAPI();
        return typeof val === "number" ? val : null;
    }
    try {
        const { data, error } = await supabase.rpc("increment_strikes");
        if (error) throw error;
        return data ?? null;
    } catch {
        return null;
    }
}

// Preferred path: insert into nuke_launches to trigger increment via DB trigger
export async function logStrike(): Promise<number | null> {
    if (!isSupabaseConfigured()) {
        return incrementGlobalStrikes();
    }
    try {
        const payload: any = {
            session_id: (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        };
        const { error } = await supabase.from("nuke_launches").insert(payload);
        if (error) throw error;
        // Read latest count
        return await getGlobalStrikes();
    } catch {
        // Fallback to RPC if insert path fails
        return await incrementGlobalStrikes();
    }
}

// Subscribe to real-time updates
export function subscribeToStrikes(callback: (count: number) => void) {
    if (!isSupabaseConfigured()) {
        // Fallback polling when Supabase isn't configured
        let cancelled = false;
        const poll = async () => {
            if (cancelled) return;
            const val = await readCountAPI();
            if (typeof val === "number") callback(val);
        };
        poll();
        const id = setInterval(poll, 10000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }
    const channel = supabase
        .channel("global-strikes")
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "global_strikes",
            },
            (payload) => {
                callback(payload.new.count);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}

