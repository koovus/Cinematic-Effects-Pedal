import { ReplitConnectors } from "@replit/connectors-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../artifacts/cep1/public/sounds");

const SCHEMAS = [
  {
    id: "jurassic-park",
    prompt:
      "Tyrannosaurus Rex deep thunderous prehistoric roar, dinosaur footsteps rumbling the ground, jungle ambience with distant creature calls",
    duration: 22,
  },
  {
    id: "star-wars",
    prompt:
      "Lightsaber electric hum and buzz, sci-fi energy weapon drone, oscillating electronic tone with harmonic resonance",
    duration: 22,
  },
  {
    id: "chainsaw-massacre",
    prompt:
      "Chainsaw engine revving and idling, industrial motor grinding, mechanical blade spinning, gritty metallic noise",
    duration: 22,
  },
  {
    id: "alive",
    prompt:
      "Howling blizzard wind in the Andes mountains, icy gusts across frozen terrain, cold winter storm ambience, desolate high altitude wind",
    duration: 22,
  },
  {
    id: "contact",
    prompt:
      "Deep space radio signal interference, cosmic static transmission, alien frequency modulation, interstellar white noise with sweeping tones",
    duration: 22,
  },
  {
    id: "scarface",
    prompt:
      "1980s Miami nightclub bass thumping, cocaine era synthesizer pulse, urban street atmosphere with distant helicopter and city hum",
    duration: 22,
  },
];

async function generateSound(connectors, schema) {
  console.log(`\nGenerating: ${schema.id} ...`);
  console.log(`  Prompt: "${schema.prompt}"`);

  const response = await connectors.proxy(
    "elevenlabs",
    "/v1/sound-generation",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: schema.prompt,
        duration_seconds: schema.duration,
        prompt_influence: 0.5,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs API error for ${schema.id}: ${response.status} — ${err}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const outPath = path.join(OUTPUT_DIR, `${schema.id}.mp3`);
  fs.writeFileSync(outPath, Buffer.from(arrayBuffer));

  const kb = Math.round(arrayBuffer.byteLength / 1024);
  console.log(`  Saved: ${outPath} (${kb} KB)`);
}

async function main() {
  const connectors = new ReplitConnectors();

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log("CEP1 — Sound Effect Generator");
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  for (const schema of SCHEMAS) {
    try {
      await generateSound(connectors, schema);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  console.log("\nDone.");
}

main();
