import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BRAND_PURPLE = '#8B5CF6'
const BRAND_PURPLE_DEEP = '#7C3AED'
const BRAND_PURPLE_DARK = '#6D28D9'
const BRAND_PURPLE_LIGHT = '#A78BFA'

const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
<rect x="7.5" y="0" width="1" height="1" fill="${BRAND_PURPLE_LIGHT}"/>
<rect x="5" y="1" width="6" height="5" fill="${BRAND_PURPLE}"/>
<rect x="7" y="3" width="1" height="1" fill="#FFFFFF"/>
<rect x="9" y="3" width="1" height="1" fill="#FFFFFF"/>
<rect x="6" y="6" width="4" height="4" fill="${BRAND_PURPLE_DEEP}"/>
<rect x="4" y="7" width="2" height="1" fill="${BRAND_PURPLE_DARK}"/>
<rect x="10" y="7" width="2" height="1" fill="${BRAND_PURPLE_DARK}"/>
<rect x="6" y="10" width="2" height="2" fill="${BRAND_PURPLE_DEEP}"/>
<rect x="8" y="10" width="2" height="2" fill="${BRAND_PURPLE_DEEP}"/>
</svg>`

// Render at native 16x16, then upscale 8x with nearest-neighbor to keep crisp pixel edges.
const outPath = join(process.cwd(), 'public/images/syntric-mascot.png')

await sharp(Buffer.from(svg))
  .resize(128, 128, { kernel: 'nearest' })
  .png()
  .toFile(outPath)

console.log(`Wrote ${outPath}`)
