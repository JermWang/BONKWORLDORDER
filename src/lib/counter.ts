export async function readGlobal(): Promise<number | null> {
	try {
		const res = await fetch("https://api.countapi.xyz/get/bwo/global_nukes", { cache: "no-store" });
		if (!res.ok) return null;
		const json = await res.json();
		return typeof json?.value === "number" ? json.value : null;
	} catch {
		return null;
	}
}

export async function incrementGlobal(): Promise<number | null> {
	try {
		const res = await fetch("https://api.countapi.xyz/hit/bwo/global_nukes", { cache: "no-store" });
		if (!res.ok) return null;
		const json = await res.json();
		return typeof json?.value === "number" ? json.value : null;
	} catch {
		return null;
	}
}

export function getSessionCount(): number {
	const raw = sessionStorage.getItem("bwo:nuke:sessionCount");
	return raw ? parseInt(raw, 10) || 0 : 0;
}

export function bumpSessionCount(): number {
	const next = getSessionCount() + 1;
	sessionStorage.setItem("bwo:nuke:sessionCount", String(next));
	return next;
}


