// Renders the app icons from the white ACC mark in public/logo.png.
//
// The source art is white-on-transparent, so it needs a background to be
// legible as a favicon or home-screen icon. We composite it onto the brand
// green — one icon that reads correctly in both light and dark UI.
//
// Run with: node scripts/build-icons.mjs

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(root, "public", "logo.png");
const APP = path.join(root, "src", "app");

const ACCENT = { r: 0x4e, g: 0x9e, b: 0x5f, alpha: 1 }; // --accent (light theme)

/** Logo centred on an accent square, with breathing room around the mark. */
async function icon(size, { padding = 0.16, radius = 0 } = {}) {
  const inner = Math.round(size * (1 - padding * 2));
  const mark = await sharp(SRC).resize(inner, inner, { fit: "contain" }).toBuffer();

  let img = sharp({
    create: { width: size, height: size, channels: 4, background: ACCENT },
  }).composite([{ input: mark, gravity: "centre" }]);

  if (radius) {
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
    );
    img = sharp(await img.png().toBuffer()).composite([
      { input: mask, blend: "dest-in" },
    ]);
  }
  return img.png().toBuffer();
}

await mkdir(APP, { recursive: true });

// Browser tab / PWA icon — rounded so it looks right on a dark tab strip.
await writeFile(path.join(APP, "icon.png"), await icon(512, { radius: 96 }));

// iOS home screen. Apple applies its own mask, so keep the corners square
// and the mark generously inset.
await writeFile(
  path.join(APP, "apple-icon.png"),
  await icon(180, { padding: 0.2 }),
);

// Android maskable icon for the manifest (extra padding for the safe zone).
await writeFile(
  path.join(root, "public", "icon-maskable.png"),
  await icon(512, { padding: 0.26 }),
);

console.log("icons written: src/app/icon.png, src/app/apple-icon.png, public/icon-maskable.png");
