/**
 * Pre-generates Mongolian TTS audio for the 12 quick tourist phrases.
 * Saves WAV files to:
 *   apps/mobile/assets/phrases/phrase-00.wav … phrase-11.wav
 *   apps/web/public/phrases/phrase-00.wav    … phrase-11.wav
 *
 * Usage (from repo root):
 *   node apps/web/scripts/generate-phrases.mjs
 *
 * Requires CHIMEGE_TTS_TOKEN in apps/web/.env (read automatically).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");

// Read token from apps/web/.env
const envPath = path.join(ROOT, "apps/web/.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const tokenMatch = envContent.match(/^CHIMEGE_TTS_TOKEN=(.+)$/m);
if (!tokenMatch) {
  console.error("CHIMEGE_TTS_TOKEN not found in apps/web/.env");
  process.exit(1);
}
const TOKEN = tokenMatch[1].trim();

const PHRASES = [
  { en: "I am lost.",                         mn: "Би төөрчихлөө." },
  { en: "Where is the nearest bus stop?",     mn: "Ойрын автобусны буудал хаана байна вэ?" },
  { en: "Where can I find WiFi?",             mn: "Интернет хаана байдаг вэ?" },
  { en: "How much does this cost?",           mn: "Энэ хэд вэ?" },
  { en: "Where is the toilet?",               mn: "Жорлон хаана байна вэ?" },
  { en: "Please help me.",                    mn: "Надад тусалж өгнө үү." },
  { en: "I need a doctor.",                   mn: "Надад эмч хэрэгтэй байна." },
  { en: "Where is the hotel?",               mn: "Зочид буудал хаана байна вэ?" },
  { en: "Do you speak English?",              mn: "Та англиар ярьж чадах уу?" },
  { en: "Thank you.",                         mn: "Баярлалаа." },
  { en: "How do I get to the city center?",  mn: "Хот төв рүү хэрхэн очих вэ?" },
  { en: "Can you call a taxi for me?",        mn: "Надад такси дуудаж өгнө үү." },
];

const MOBILE_OUT = path.join(ROOT, "apps/mobile/assets/phrases");
const WEB_OUT    = path.join(ROOT, "apps/web/public/phrases");

async function synthesize(text) {
  const res = await fetch("https://api.chimege.com/v1.2/synthesize", {
    method: "POST",
    headers: {
      Token: TOKEN,
      "Content-Type": "text/plain",
      "voice-id": "FEMALE4v2",
    },
    body: text,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chimege error ${res.status}: ${body}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  console.log(`Generating ${PHRASES.length} phrase audio files…\n`);

  for (let i = 0; i < PHRASES.length; i++) {
    const phrase = PHRASES[i];
    const filename = `phrase-${String(i).padStart(2, "0")}.wav`;

    process.stdout.write(`[${i + 1}/${PHRASES.length}] "${phrase.en}" … `);
    try {
      const audio = await synthesize(phrase.mn);

      fs.writeFileSync(path.join(MOBILE_OUT, filename), audio);
      fs.writeFileSync(path.join(WEB_OUT, filename), audio);

      console.log(`✓ ${filename} (${(audio.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
    }

    // Small delay to avoid rate-limiting
    if (i < PHRASES.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Write a manifest so the app knows which index maps to which phrase
  const manifest = PHRASES.map((p, i) => ({
    index: i,
    file: `phrase-${String(i).padStart(2, "0")}.wav`,
    en: p.en,
    mn: p.mn,
  }));
  const manifestJson = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(path.join(MOBILE_OUT, "manifest.json"), manifestJson);
  fs.writeFileSync(path.join(WEB_OUT, "manifest.json"), manifestJson);

  console.log("\nDone. Files written to:");
  console.log(`  apps/mobile/assets/phrases/`);
  console.log(`  apps/web/public/phrases/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
