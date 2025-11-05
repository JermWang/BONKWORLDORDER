import React, { useEffect, useMemo, useState } from "react";
import { getGlobalStrikes, subscribeToStrikes } from "@/lib/supabase";
import { XLogo } from "@/components/icons/XLogo";

export const CounterWidget: React.FC = () => {
    const [globalCount, setGlobalCount] = useState<number | null>(null);

    // Initial fetch + realtime subscription
    useEffect(() => {
        let mounted = true;
        getGlobalStrikes().then((val) => {
            if (mounted) setGlobalCount(val);
        });
        const unsubscribe = subscribeToStrikes((val) => setGlobalCount(val));
        return () => {
            mounted = false;
            unsubscribe?.();
        };
    }, []);

	const displayGlobal = useMemo(() => (globalCount == null ? "—" : globalCount.toLocaleString()), [globalCount]);

    // Immediate optimistic updates from launch sequence
    useEffect(() => {
        const onUpdate = (e: any) => {
            const v = e?.detail;
            if (typeof v === "number") setGlobalCount(v);
        };
        window.addEventListener("strikes:update", onUpdate as EventListener);
        return () => window.removeEventListener("strikes:update", onUpdate as EventListener);
    }, []);

    return (
        <div className="fixed left-20 top-1/2 -translate-y-1/2 z-[9100] select-none">
            <div className="rounded-xl border border-emerald-500/40 bg-black/50 backdrop-blur-md px-5 py-3 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">Global Strikes</div>
                        <div className="text-3xl font-extrabold text-emerald-200 leading-tight">{displayGlobal}</div>
                    </div>
                    <a
                        href="https://x.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="X (Twitter)"
                        className="ml-1 text-emerald-300/80 hover:text-emerald-200"
                    >
                        <XLogo className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default CounterWidget;


