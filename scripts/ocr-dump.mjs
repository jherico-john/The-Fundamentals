import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import path from 'path'; import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lang = path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');
const worker = await createWorker('eng', 1, { langPath: lang, logger: () => {} });
const dir = process.argv[2]; const mode = process.argv[3] || 'a';
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.png')).sort()) {
  let img = sharp(path.join(dir, f)).greyscale().normalize();
  const meta = await sharp(path.join(dir, f)).metadata();
  img = img.resize({ width: Math.round(meta.width * 2), kernel: 'lanczos3' });
  if (mode === 'inv') img = img.negate();
  const buf = await img.png().toBuffer();
  const { data } = await worker.recognize(buf);
  console.log('\n======== ' + f + ' (' + mode + ') ========\n' + data.text);
}
await worker.terminate();
