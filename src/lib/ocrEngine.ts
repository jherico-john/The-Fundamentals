// src/lib/ocrEngine.ts — v5
// ─────────────────────────────────────────────────────────────────────────────
// "eng.traineddata upgrade" — what changed vs v4 and why
//
// A model cannot be re-trained from a dozen screenshots (LSTM fine-tuning needs
// thousands of ground-truthed line images), so v5 upgrades OCR accuracy in the
// ways that DO work for payment receipts:
//
//   1. sharp-based preprocessing (v4 used jimp, which cannot even decode WEBP):
//      EXIF auto-rotate → greyscale → normalise → 2× Lanczos upscale (small
//      phone screenshots OCR far better at ~1600px wide).
//   2. Multi-pass scanning. Pass A is the fast path. If the parsed result is
//      incomplete we retry with a sharpened variant and an inverted variant
//      (dark-header receipts such as Maya / GoTyme) and keep the best parse.
//   3. Model escalation. Primary worker = `4.0.0_best_int` (fast, small).
//      Rescue worker = `4.0.0` (float "best" model, slower but more accurate),
//      created lazily ONLY when the fast model could not read the receipt.
//      Override with OCR_LANG_PATH (directory containing eng.traineddata[.gz]).
//   4. Domain post-correction (paymentChannels.normalizeOcr) for brand strings
//      (instaFay → InstaPay, G-Xchanqe …) and parsers tuned on 12 real receipts.
//   5. A mutex around the shared worker: setParameters() + recognize() must not
//      interleave between two concurrent requests on one serverless instance.
// ─────────────────────────────────────────────────────────────────────────────
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { createWorker, type Worker } from 'tesseract.js';
import { parseReceiptText, type ParsedReceipt } from './receiptParser';

// ── path resolution (resolved before webpack can rewrite __dirname) ──────────
function resolveWorkerPath(): string | undefined {
  try {
    const pkg = require.resolve('tesseract.js/package.json');
    const p = path.join(path.dirname(pkg), 'src', 'worker-script', 'node', 'index.js');
    fs.accessSync(p);
    return p;
  } catch { return undefined; }
}

function langDir(variant: '4.0.0_best_int' | '4.0.0'): string | undefined {
  const override = process.env.OCR_LANG_PATH;
  if (override && variant === '4.0.0_best_int') {
    try {
      if (fs.existsSync(path.join(override, 'eng.traineddata')) || fs.existsSync(path.join(override, 'eng.traineddata.gz'))) return override;
    } catch { /* fall through */ }
  }
  try {
    const pkg = require.resolve('@tesseract.js-data/eng/package.json');
    const p = path.join(path.dirname(pkg), variant);
    fs.accessSync(path.join(p, 'eng.traineddata.gz'));
    return p;
  } catch { return undefined; }
}

const WORKER_PATH = resolveWorkerPath();

// ── worker pool: fast + rescue ───────────────────────────────────────────────
type Tier = 'fast' | 'rescue';
const workers: Partial<Record<Tier, Promise<Worker>>> = {};

function getWorker(tier: Tier): Promise<Worker> {
  if (!workers[tier]) {
    const variant = tier === 'fast' ? '4.0.0_best_int' : '4.0.0';
    let lp = langDir(variant);
    if (!lp && tier === 'rescue') lp = langDir('4.0.0_best_int');
    const override = process.env.OCR_LANG_PATH;
    const useRaw = !!override && lp === override &&
      fs.existsSync(path.join(override, 'eng.traineddata')) && !fs.existsSync(path.join(override, 'eng.traineddata.gz'));
    workers[tier] = createWorker('eng', 1, {
      logger: () => {},
      ...(WORKER_PATH ? { workerPath: WORKER_PATH } : {}),
      ...(lp ? { langPath: lp } : {}),
      ...(useRaw ? { gzip: false } : {}),
    }).catch(err => { delete workers[tier]; throw err; });
  }
  return workers[tier]!;
}

// serialise access to the shared workers
let chain: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

// ── image variants ───────────────────────────────────────────────────────────
export interface ImageInfo { width: number; height: number; format: string }

export async function inspectImage(buf: Buffer): Promise<ImageInfo> {
  const m = await sharp(buf, { failOn: 'none', limitInputPixels: 80_000_000 }).metadata();
  if (!m.width || !m.height) throw new Error('no-dimensions');
  return { width: m.width, height: m.height, format: m.format || 'unknown' };
}

type VariantName = 'base' | 'sharp' | 'invert';

async function makeVariant(buf: Buffer, name: VariantName): Promise<Buffer> {
  const meta = await sharp(buf, { failOn: 'none' }).rotate().metadata();
  const w = meta.width || 800;
  // target ≈ 1700px wide: upscale small screenshots, cap huge camera images
  const target = Math.max(1400, Math.min(2200, Math.round(w * 2)));
  let img = sharp(buf, { failOn: 'none', limitInputPixels: 80_000_000 })
    .rotate()
    .flatten({ background: '#ffffff' })     // transparent PNG → white
    .greyscale()
    .normalize()
    .resize({ width: target, kernel: 'lanczos3', withoutEnlargement: false });
  if (name === 'sharp') img = img.sharpen({ sigma: 1.2 }).linear(1.25, -20);
  if (name === 'invert') img = img.negate();
  return img.png().toBuffer();
}

async function recognize(tier: Tier, png: Buffer, psm: '3' | '11'): Promise<string> {
  return exclusive(async () => {
    const w = await getWorker(tier);
    await w.setParameters({ tessedit_pageseg_mode: psm as never, preserve_interword_spaces: '1' });
    const { data } = await w.recognize(png);
    return data.text || '';
  });
}

export interface OcrResult {
  text: string;
  allTexts: string[];
  parsed: ParsedReceipt;
  passes: string[];
}

const GOOD_ENOUGH = 85;

function better(a: ParsedReceipt, b: ParsedReceipt): ParsedReceipt {
  return b.completeness > a.completeness ? b : a;
}

/**
 * Read a receipt. Fast path = one pass. Falls back to extra variants and the
 * rescue model only when the first parse is incomplete.
 */
export async function readReceipt(buf: Buffer): Promise<OcrResult> {
  const passes: string[] = [];
  const texts: string[] = [];
  let bestText = '';
  let best: ParsedReceipt | null = null;

  const attempt = async (tier: Tier, variant: VariantName, psm: '3' | '11') => {
    const png = await makeVariant(buf, variant);
    const text = await recognize(tier, png, psm);
    passes.push(`${tier}:${variant}:psm${psm}`);
    texts.push(text);
    const parsed = parseReceiptText(text);
    if (!best || parsed.completeness > best.completeness) { best = better(best || parsed, parsed); bestText = text; }
    return parsed;
  };

  await attempt('fast', 'base', '3');
  const done = () => !!best && best.completeness >= GOOD_ENOUGH;
  if (!done()) await attempt('fast', 'sharp', '11');
  if (!done()) await attempt('fast', 'invert', '3');
  if (!done()) {
    try { await attempt('rescue', 'base', '3'); } catch (e) { console.warn('[ocr] rescue model unavailable:', (e as Error).message); }
  }
  return { text: bestText, allTexts: texts, parsed: best!, passes };
}

// ── tamper signatures ────────────────────────────────────────────────────────
const EDITOR_SIGNATURES = [
  'Adobe Photoshop', 'Photoshop', 'Lightroom', 'GIMP', 'Canva', 'Snapseed', 'PicsArt',
  'Pixlr', 'Paint.NET', 'FaceApp', 'Photopea', 'Fotor', 'PhotoRoom', 'Afterlight', 'VSCO',
];

/** Looks for image-editor fingerprints in EXIF/XMP/PNG text chunks. */
export function detectEditorSignature(buf: Buffer): string | null {
  const head = buf.subarray(0, Math.min(buf.length, 262144)).toString('latin1');
  const tail = buf.length > 262144 ? buf.subarray(Math.max(0, buf.length - 65536)).toString('latin1') : '';
  const hay = head + tail;
  for (const sig of EDITOR_SIGNATURES) if (hay.includes(sig)) return sig;
  return null;
}
