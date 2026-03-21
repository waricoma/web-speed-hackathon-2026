import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";

const DIST = new URL("../../dist", import.meta.url).pathname;
const EXTS = new Set([".js", ".css", ".html", ".svg", ".json"]);

// Detect CLI availability
let hasBrotliCLI = false;
let hasGzipCLI = false;
try { execSync("brotli --version", { stdio: "ignore" }); hasBrotliCLI = true; } catch {}
try { execSync("gzip --version", { stdio: "ignore" }); hasGzipCLI = true; } catch {}

function compressFile(filePath) {
  // Brotli compression
  if (hasBrotliCLI) {
    try { execSync(`brotli -fk "${filePath}"`); } catch {}
  } else {
    const input = readFileSync(filePath);
    const compressed = brotliCompressSync(input, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      },
    });
    writeFileSync(filePath + ".br", compressed);
  }

  // Gzip compression
  if (hasGzipCLI) {
    try { execSync(`gzip -fk "${filePath}"`); } catch {}
  } else {
    const input = readFileSync(filePath);
    const compressed = gzipSync(input, { level: 9 });
    writeFileSync(filePath + ".gz", compressed);
  }
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (EXTS.has(extname(entry.name))) {
      compressFile(full);
    }
  }
}

walk(DIST);
console.log("Pre-compression complete");
