const rawBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
export const API_BASE = rawBase.replace(/\/$/, "");
export const UPLOADS_BASE = `${API_BASE}/uploads`;
export const VENDOR_PLACEHOLDER = `${UPLOADS_BASE}/placeholders/vendor.svg`;

export const resolveMediaUrl = (url?: string | null) => {
    if (!url) return VENDOR_PLACEHOLDER;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/")) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
};

export const fileToBase64 = (file: File, maxSizeMb = 10): Promise<string> =>
    new Promise((resolve, reject) => {
        const maxBytes = maxSizeMb * 1024 * 1024;
        if (file.size > maxBytes) {
            reject(new Error(`File ${file.name} exceeds ${maxSizeMb}MB`));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });

export const filesToBase64 = async (files: File[], maxSizeMb = 10) => {
    const results: string[] = [];
    for (const file of files) {
        results.push(await fileToBase64(file, maxSizeMb));
    }
    return results;
};

type ErrorBody = { message?: unknown; error?: unknown };
type ErrorWithBody = { body?: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const getErrorMessage = (error: unknown, fallback: string) => {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (error instanceof Error && error.message) return error.message;
    if (isRecord(error) && "body" in error) {
        const body = (error as ErrorWithBody).body;
        if (isRecord(body)) {
            const msg = (body as ErrorBody).message;
            if (typeof msg === "string" && msg.trim().length > 0) return msg;
            const err = (body as ErrorBody).error;
            if (typeof err === "string" && err.trim().length > 0) return err;
        }
    }
    return fallback;
};
