// Fails if the built bundle references external hosts (CDN fonts, scripts, tiles). See docs/11_FRONTEND.md section 10.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const allow = [/^https?:\/\/(www\.)?w3\.org/, /^https?:\/\/reactflow\.dev/, /^https?:\/\/react\.dev/, /^https?:\/\/reactjs\.org/, /^https?:\/\/github\.com/, /^https?:\/\/localhost/]
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const bad = []
for (const f of walk('dist')) {
  if (!/\.(html|css)$/.test(f)) continue
  const txt = readFileSync(f, 'utf8')
  for (const m of txt.matchAll(/(?:src|href|url\()\s*=?\s*["']?(https?:\/\/[^"')\s]+)/g)) {
    if (!allow.some((a) => a.test(m[1]))) bad.push(`${f}: ${m[1]}`)
  }
}
if (bad.length) { console.error('External runtime resources found:\n' + bad.join('\n')); process.exit(1) }
console.log('Offline check passed: no external runtime resources in html/css.')
