import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const BASE = join(process.cwd(), 'src', 'renderer', 'OSINT')

const CAT_LABELS = {
  ACADEMIC: 'Academic',
  AVIATION: 'Aviation',
  CORPORATE: 'Corporate',
  CRYPTO: 'Crypto',
  CYBINT: 'Cybint',
  DARKWEB: 'Darkweb',
  DIGITAL_FORENSICS: 'Digital Forensics',
  FININT: 'Finint',
  GEOINT: 'Geoint',
  GOVERNMENT: 'Government',
  HUMINT: 'Humint',
  IMINT: 'Imint',
  LEGAL: 'Legal',
  MARINT: 'Marint',
  MASINT: 'Masint',
  MEDIA: 'Media',
  SIGINT: 'Sigint',
  SOCMINT: 'Socmint',
  TECHINT: 'Techint',
  THREAT_INTEL: 'Threat Intel'
}

function extractDesc (md) {
  const summaryMatch = md.match(/##\s*Резюме\s*\n+([^#>][^\n]+)/)
  if (summaryMatch) return summaryMatch[1].trim()
  const lines = md.split('\n')
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('>')) continue
    return t
  }
  return ''
}

const data = []
const cats = readdirSync(BASE, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()

for (const cat of cats) {
  const files = readdirSync(join(BASE, cat)).filter(f => f.endsWith('.md')).sort()
  for (const file of files) {
    const md = readFileSync(join(BASE, cat, file), 'utf-8')
    const titleMatch = md.match(/^#\s+(.+)$/m)
    const num = (file.match(/^(\d+)/) || [])[1] || file.replace('.md', '')
    data.push({
      id: `${cat.toLowerCase()}-${num}`,
      title: titleMatch ? titleMatch[1].trim() : `${cat} — ${file}`,
      cat: CAT_LABELS[cat] || cat,
      obj: cat,
      methods: '',
      desc: extractDesc(md),
      content: md
    })
  }
}

const out = `// AUTO-GENERATED from src/renderer/OSINT/**. Do not edit by hand.
// Regenerate: node scripts/gen-osint-data.mjs

export const osintData = ${JSON.stringify(data, null, 2)}
`

writeFileSync(join(BASE, 'osintData.js'), out, 'utf-8')
console.log(`OK: ${data.length} manuals across ${cats.length} categories -> src/renderer/OSINT/osintData.js`)
