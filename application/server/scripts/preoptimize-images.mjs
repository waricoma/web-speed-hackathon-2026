import { readdirSync, existsSync } from "node:fs";
import { join, parse, extname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_PATH = path.resolve(__dirname, "../../public");
const UPLOAD_PATH = path.resolve(__dirname, "../../upload");

const TARGETS = [
  { dir: join(PUBLIC_PATH, "images"), width: 640 },
  { dir: join(PUBLIC_PATH, "images", "profiles"), width: 128 },
];

// Also process upload dirs if they exist
if (existsSync(join(UPLOAD_PATH, "images"))) {
  TARGETS.push({ dir: join(UPLOAD_PATH, "images"), width: 640 });
}

async function processDir({ dir, width }) {
  if (!existsSync(dir)) return;
  const files = readdirSync(dir);
  let count = 0;
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) continue;

    const base = parse(file).name;
    const srcPath = join(dir, file);

    // Generate AVIF (smaller than WebP, preferred by modern browsers)
    const avifPath = join(dir, `${base}.avif`);
    if (!existsSync(avifPath)) {
      try {
        await sharp(srcPath)
          .resize({ width, withoutEnlargement: true })
          .avif({ quality: 55, speed: 4 })
          .toFile(avifPath);
        count++;
      } catch (e) {
        console.error(`Failed AVIF: ${file}`, e.message);
      }
    }

    // Also generate WebP as fallback
    const webpPath = join(dir, `${base}.webp`);
    if (!existsSync(webpPath)) {
      try {
        await sharp(srcPath)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 75 })
          .toFile(webpPath);
      } catch (e) {
        console.error(`Failed WebP: ${file}`, e.message);
      }
    }
  }
  if (count > 0) console.log(`Converted ${count} images to AVIF+WebP in ${dir}`);
}

for (const target of TARGETS) {
  await processDir(target);
}
console.log("Image pre-optimization complete (AVIF + WebP)");
