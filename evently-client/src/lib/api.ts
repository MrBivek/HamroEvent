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
