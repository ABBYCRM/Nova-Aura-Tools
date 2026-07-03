import express, { Router, type IRouter } from "express";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

// Server-side voice-to-text. Primary engine is NVIDIA Riva ASR (Whisper-large-v3
// hosted on NVCF, gRPC) using the server NVIDIA_API_KEY; if that's unavailable or
// fails, we fall back to OpenAI Whisper. No speech key ever lives in the browser.
const router: IRouter = Router();

const NVIDIA_WHISPER_FUNCTION_ID =
  process.env["NVIDIA_WHISPER_FUNCTION_ID"] || "b702f636-f60c-4a3d-a6f4-f3568c13bd7d";

// Minimal self-contained Riva ASR proto (field numbers verified against
// nvidia-riva/common). Written to a temp file at runtime because the bundled
// server has no node_modules / source tree to load .proto from.
const RIVA_PROTO = `syntax = "proto3";
package nvidia.riva.asr;
enum AudioEncoding { ENCODING_UNSPECIFIED = 0; LINEAR_PCM = 1; FLAC = 2; MULAW = 3; OGGOPUS = 4; ALAW = 20; }
message RecognitionConfig {
  AudioEncoding encoding = 1;
  int32 sample_rate_hertz = 2;
  string language_code = 3;
  int32 max_alternatives = 4;
  int32 audio_channel_count = 7;
  bool enable_automatic_punctuation = 11;
}
message RecognizeRequest { RecognitionConfig config = 1; bytes audio = 2; }
message SpeechRecognitionAlternative { string transcript = 1; float confidence = 2; }
message SpeechRecognitionResult { repeated SpeechRecognitionAlternative alternatives = 1; }
message RecognizeResponse { repeated SpeechRecognitionResult results = 1; }
service RivaSpeechRecognition { rpc Recognize(RecognizeRequest) returns (RecognizeResponse) {} }
`;

let asrClient: { Recognize: Function } | null = null;
function getAsrClient(): { Recognize: Function } {
  if (asrClient) return asrClient;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "riva-"));
  const file = path.join(dir, "riva_min.proto");
  fs.writeFileSync(file, RIVA_PROTO);
  const def = protoLoader.loadSync(file, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(def) as unknown as {
    nvidia: { riva: { asr: { RivaSpeechRecognition: new (addr: string, creds: grpc.ChannelCredentials) => { Recognize: Function } } } };
  };
  const ASR = loaded.nvidia.riva.asr.RivaSpeechRecognition;
  asrClient = new ASR("grpc.nvcf.nvidia.com:443", grpc.credentials.createSsl());
  return asrClient!;
}

// Parse a canonical PCM WAV: pull the data chunk + sample rate + channel count.
function parseWav(buf: Buffer): { pcm: Buffer; sampleRate: number; channels: number } | null {
  if (buf.length < 44) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let off = 12;
  let sampleRate = 16000;
  let channels = 1;
  let dataOff = -1;
  let dataLen = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(off + 10);
      sampleRate = buf.readUInt32LE(off + 12);
    } else if (id === "data") {
      dataOff = off + 8;
      dataLen = size;
      break;
    }
    off += 8 + size + (size % 2);
  }
  if (dataOff < 0) return null;
  return { pcm: buf.subarray(dataOff, dataOff + dataLen), sampleRate, channels };
}

function nvidiaTranscribe(pcm: Buffer, sampleRate: number, channels: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const key = process.env["NVIDIA_API_KEY"] ?? "";
    if (!key) { reject(new Error("NVIDIA_API_KEY not set")); return; }
    const client = getAsrClient();
    const meta = new grpc.Metadata();
    meta.add("function-id", NVIDIA_WHISPER_FUNCTION_ID);
    meta.add("authorization", "Bearer " + key);
    client.Recognize(
      {
        config: {
          encoding: "LINEAR_PCM",
          sample_rate_hertz: sampleRate,
          language_code: "en-US",
          max_alternatives: 1,
          audio_channel_count: channels || 1,
          enable_automatic_punctuation: true,
        },
        audio: pcm,
      },
      meta,
      { deadline: new Date(Date.now() + 60_000) },
      (err: unknown, resp: { results?: { alternatives?: { transcript?: string }[] }[] }) => {
        if (err) { reject(err); return; }
        const text = (resp.results ?? [])
          .flatMap((r) => r.alternatives ?? [])
          .map((a) => a.transcript ?? "")
          .join(" ")
          .trim();
        resolve(text);
      },
    );
  });
}

async function openaiTranscribe(buf: Buffer, mime: string): Promise<string> {
  const key = process.env["OPENAI_API_KEY"] ?? "";
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const ext = /wav/.test(mime) ? "wav" : /mp4|m4a|aac/.test(mime) ? "m4a" : /mpeg|mp3/.test(mime) ? "mp3" : "webm";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: mime }), `clip.${ext}`);
  form.append("model", "whisper-1");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`openai ${r.status}: ${text.slice(0, 200)}`);
  let parsed: { text?: string };
  try { parsed = JSON.parse(text); } catch { parsed = {}; }
  return (parsed.text ?? "").trim();
}

// Voices OpenAI's TTS accepts; anything else falls back to the default so a bad
// client value can't turn into a 400 from the provider.
const TTS_VOICES = new Set(["alloy", "ash", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]);

// Text → speech (the AI talks back): returns an MP3 the browser can play
// directly, using the SERVER OpenAI key — no TTS key ever lives in the browser.
// 501 when unconfigured, which tells the client to fall back to
// speechSynthesis. Shared with the SUPERNOVA twin (same endpoint there).
router.post("/voice/speak", express.json({ limit: "64kb" }), async (req, res) => {
  const { text, voice, speed } = (req.body ?? {}) as { text?: string; voice?: string; speed?: number };
  const input = String(text ?? "").trim();
  if (!input) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const key = process.env["OPENAI_API_KEY"] ?? "";
  if (!key) {
    res.status(501).json({ error: "server TTS not configured (OPENAI_API_KEY missing)" });
    return;
  }
  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1",
        voice: TTS_VOICES.has(String(voice)) ? voice : "nova",
        input: input.slice(0, 4096),
        speed: Math.min(2, Math.max(0.5, Number(speed) || 1.05)),
      }),
    });
    if (!r.ok) {
      const err = (await r.text()).slice(0, 200);
      res.status(502).json({ error: `openai tts ${r.status}: ${err}` });
      return;
    }
    const audio = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);
  } catch (e) {
    res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

router.post(
  "/voice/transcribe",
  express.raw({ type: () => true, limit: "25mb" }),
  async (req, res) => {
    const buf = req.body as Buffer;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      res.status(400).json({ error: "no audio received" });
      return;
    }
    const mime = String(req.headers["content-type"] || "audio/wav");

    // Primary: NVIDIA Whisper (needs PCM WAV + the NVIDIA key).
    const wav = parseWav(buf);
    if (process.env["NVIDIA_API_KEY"] && wav) {
      try {
        const text = await nvidiaTranscribe(wav.pcm, wav.sampleRate, wav.channels);
        if (text) { res.json({ text, engine: "nvidia-whisper-large-v3" }); return; }
      } catch (e) {
        req.log?.warn?.({ err: e instanceof Error ? e.message : String(e) }, "nvidia ASR failed, falling back");
      }
    }

    // Fallback: OpenAI Whisper (accepts wav/webm/etc directly).
    try {
      const text = await openaiTranscribe(buf, mime);
      res.json({ text, engine: "openai-whisper-1" });
    } catch (e) {
      res.status(502).json({ error: e instanceof Error ? e.message : String(e) });
    }
  },
);

export default router;
