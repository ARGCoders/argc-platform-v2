// Converts V1's lib/ascii-frames.ts (a ~19.3 MB TS module of template literals)
// into a static text asset so the frames never enter the JS bundle. See plan D4.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const SRC = process.argv[2]
const OUT = process.argv[3]
const SEP = '\f' // U+000C form feed — record separator

const raw = readFileSync(SRC, 'utf8')

// The module is exactly: export const ASCII_FRAMES = [ `...`, `...` ];
// No ${} interpolation (verified), so evaluating the literal is safe.
const literal = raw.replace(/^\s*export\s+const\s+ASCII_FRAMES\s*=\s*/, '')
// Frames are copied verbatim.
//
// Trailing whitespace looks strippable — it is invisible inside a <pre> — and
// removing it halves the file. Do not. It sets the width of the <pre> box, and
// the parent centres that box: stripping narrowed the canvas from 533 to 411
// columns and shifted the art off-centre.
const frames = new Function(`return ${literal}`)()

if (!Array.isArray(frames)) throw new Error('parsed value is not an array')
if (frames.some((f) => typeof f !== 'string')) throw new Error('non-string frame found')
if (frames.some((f) => f.includes(SEP))) throw new Error('a frame contains the separator')

mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true })
writeFileSync(OUT, frames.join(SEP), 'utf8')

const cols = Math.max(...frames[0].split('\n').map((l) => l.length))
const rows = frames[0].split('\n').length
console.log(
  `frames: ${frames.length}\n` +
    `grid:   ${cols}x${rows}\n` +
    `source: ${(Buffer.byteLength(raw) / 1048576).toFixed(1)} MB\n` +
    `output: ${(Buffer.byteLength(frames.join(SEP)) / 1048576).toFixed(1)} MB`,
)
