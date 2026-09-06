import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * Returns `body` downscaled to `maxWidth`, or unchanged when it is already
 * narrower — `sips -Z` would otherwise UPSCALE a small image, producing a
 * bigger file with no extra detail (measured: a 1066px Facebook preview came
 * back as a 1600px JPEG, 3x the bytes). Falls back to the original bytes
 * wherever sips isn't available.
 */
export function downscaleJpeg(body, maxWidth) {
  const work = mkdtempSync(join(tmpdir(), 'tdd-img-'))
  const raw = join(work, 'raw')
  const out = join(work, 'out.jpg')
  try {
    writeFileSync(raw, body)
    const info = execFileSync('sips', ['-g', 'pixelWidth', raw], { stdio: ['ignore', 'pipe', 'pipe'] }).toString()
    const width = Number(/pixelWidth:\s*(\d+)/.exec(info)?.[1] ?? 0)
    if (!width || width <= maxWidth) return body

    execFileSync(
      'sips',
      ['-Z', String(maxWidth), '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', raw, '--out', out],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    return readFileSync(out)
  } catch {
    return body
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}
