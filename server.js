import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import { uploadToTelegram, resolveFileUrl } from "./telegram.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(cors()); // lock this down to your actual frontend origin before going live

// POST /upload — receives one file field named "file", relays it to Telegram, returns its file_id
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  try {
    const fileId = await uploadToTelegram(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ fileId });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Telegram upload failed" });
  }
});

// GET /file/:fileId — streams the actual image bytes so the browser can use it directly in <img src>
app.get("/file/:fileId", async (req, res) => {
  try {
    const url = await resolveFileUrl(req.params.fileId);
    const tgRes = await fetch(url);

    if (!tgRes.ok) return res.status(502).send("Failed to fetch file from Telegram");

    res.set("Content-Type", tgRes.headers.get("content-type") || "image/jpeg");
    res.set("Cache-Control", "public, max-age=3600"); // file_path expires ~1hr, so don't cache past that
    tgRes.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(502).send("Failed to resolve file");
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Crimson Comics backend running on port ${PORT}`));
