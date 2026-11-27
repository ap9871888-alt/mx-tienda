// Después del build: escribe en dist/sw.js la lista de todos los archivos del juego para que se guarden sin internet
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs'
import { join, relative, sep } from 'path'
const dist = 'dist'; const out = []
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (!p.endsWith('sw.js')) out.push('./' + relative(dist, p).split(sep).join('/')) } }
walk(dist)
const sw = readFileSync(join(dist, 'sw.js'), 'utf8').replace('__FILES__', JSON.stringify(['./', ...out])).replace('__VERSION__', String(Date.now()))
writeFileSync(join(dist, 'sw.js'), sw)
console.log('offline: ' + out.length + ' archivos')
