// Quick harness: OCR every sample receipt and print what the parser extracts.
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import path from 'path'; import fs from 'fs'; import { createRequire } from 'module';
import { register } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
// transpile-on-the-fly loader for our TS libs
const cache = {};
function loadTs(file) {
  if (cache[file]) return cache[file];
  const src = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: 'commonjs', target: 'es2020' } }).outputText;
  const m = { exports: {} };
  const dir = path.dirname(file);
  const req = (p) => p.startsWith('./') ? loadTs(path.join(dir, p + '.ts')) : require(p);
  new Function('exports', 'require', 'module', js)(m.exports, req, m);
  return (cache[file] = m.exports);
}
const { parseReceiptText } = loadTs('src/lib/receiptParser.ts');
const lang = path.join(path.dirname(require.resolve('@tesseract.js-data/eng/package.json')), '4.0.0_best_int');
const worker = await createWorker('eng', 1, { langPath: lang, logger: () => {} });
const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter(x => /\.(png|jpg)$/.test(x)).sort()) {
  const meta = await sharp(path.join(dir, f)).metadata();
  const buf = await sharp(path.join(dir, f)).greyscale().normalize().resize({ width: meta.width * 2, kernel: 'lanczos3' }).png().toBuffer();
  const { data } = await worker.recognize(buf);
  const p = parseReceiptText(data.text);
  console.log(f.padEnd(18), JSON.stringify({ ch: p.channel, route: p.route, amt: p.amount, tot: p.total, hdr: p.headerAmount, fee: p.fee, ref: p.referenceId, ip: p.instapayRefNo, acct: p.accountNumber, name: p.accountName, date: p.dateStr, comp: p.completeness }));
}
await worker.terminate();
