import fs from "fs";
import path from "path";
import crypto from "crypto";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export function ensureUploadsDir() {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function parseDataUrl(input: string) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return { mime: match[1], base64: match[2] };
}

function extensionFromMime(mime: string) {
    if (mime === "image/png") return "png";
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/jpg") return "jpg";
    if (mime === "image/webp") return "webp";
    if (mime === "application/pdf") return "pdf";
    return "bin";
}

export type SaveBase64Options = {
    data: string;
    folder: string;
    filenamePrefix?: string;
    mimeTypeHint?: string;
};

export function saveBase64File({ data, folder, filenamePrefix, mimeTypeHint }: SaveBase64Options) {
    ensureUploadsDir();
    const parsed = parseDataUrl(data);
    const base64 = parsed?.base64 ?? data;
    const mime = parsed?.mime ?? mimeTypeHint ?? "application/octet-stream";
    const ext = extensionFromMime(mime);

    const dir = path.join(UPLOADS_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${filenamePrefix ?? "file"}-${crypto.randomUUID()}.${ext}`;
    const fullPath = path.join(dir, filename);
    fs.writeFileSync(fullPath, Buffer.from(base64, "base64"));

    const url = `/uploads/${folder}/${filename}`;
    return { url, path: fullPath };
}

export function deleteFileByUrl(url: string) {
    if (!url.startsWith("/uploads/")) return;
    const relative = url.replace("/uploads/", "");
    const fullPath = path.join(UPLOADS_DIR, relative);
    if (fullPath.startsWith(UPLOADS_DIR) && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
}
