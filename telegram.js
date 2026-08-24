import fetch from "node-fetch";
import FormData from "form-data";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn("[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing from .env — uploads will fail.");
}

/**
 * Sends a file buffer to the storage chat as a document (uncompressed,
 * so images keep full quality — Telegram's sendPhoto recompresses).
 * Returns the Telegram file_id, which is what gets stored in Firestore.
 */
export async function uploadToTelegram(buffer, filename, mimetype) {
  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("document", buffer, { filename, contentType: mimetype });

  const res = await fetch(`${API}/sendDocument`, { method: "POST", body: form });
  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram upload failed: ${data.description || "unknown error"}`);
  }

  return data.result.document.file_id;
}

/**
 * Telegram file_ids don't resolve to a public URL directly — you first
 * call getFile to get a file_path (these expire, so this lookup happens
 * fresh on every request rather than being cached long-term).
 */
export async function resolveFileUrl(fileId) {
  const res = await fetch(`${API}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const data = await res.json();

  if (!data.ok) {
    throw new Error(`Telegram getFile failed: ${data.description || "unknown error"}`);
  }

  return `${FILE_API}/${data.result.file_path}`;
}
