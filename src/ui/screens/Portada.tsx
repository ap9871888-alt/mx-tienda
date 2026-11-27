import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Play } from 'lucide-react'
import * as E from '../../engine'
import { useApp, fmt } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { Btn, Modal } from '../components/kit'
import { sfx, soundOn, setSound, sfxVolume, setSfxVolume } from '../sound'
import { Avatar, SKINS } from '../Avatar'
import { musicVolume, setMusicVolume, muteAll } from '../music'
import { usePrefs, setPrefs, getPrefs } from '../settings'
import type { CompanyProfile, Difficulty, GameState } from '../../engine/types'

export const ICONS = ['marca-carrito', 'marca-tienda', 'marca-nopal', 'marca-sol', 'marca-chile', 'marca-maiz', 'marca-taco', 'marca-estrella', 'carrito', 'tienda']
export const COLORS = ['#D63B2F', '#E0A100', '#1B4D8F', '#2E7D5B', '#7C4DDB', '#2B2D33']

export function Logo ({ small }: { small?: boolean }) {
  return (
    <div className={`bg-white/95 rounded-3xl shadow-card px-5 ${small ? 'py-2' : 'py-4'} text-center border-2 border-urbano`}>
      <div className='flex justify-center gap-1 mb-1'>{['#D63B2F', '#F2B705', '#D63B2F', '#F2B705', '#D63B2F'].map((c, i) => <span key={i} className='w-6 h-3 rounded-b-full' style={{ background: c }} />)}</div>
      <h1 className={`font-display uppercase leading-[.9] ${small ? 'text-3xl' : 'text-[46px]'}`}>Tienda <span className='text-rojo'>MX</span> <span className='text-oferta' style={{ WebkitTextStroke: '1px #2B2D33' }}>Inc.</span></h1>
      <span className='inline-block mt-1 text-[11px] font-bold tracking-wider uppercase bg-urbano text-white rounded-full px-3 py-0.5'>Imperio retail en México</span>
    </div>
  )
}

// momento del día según la hora del teléfono: cambia el tinte del fondo
function dayTint () {
  const h = new Date().getHours()
  if (h >= 20 || h < 6) return { c: 'rgba(20,32,78,.55)', mode: 'multiply' as const, night: true, label: 'Noche en la CDMX' }
  if (h >= 17) return { c: 'rgba(255,170,95,.32)', mode: 'multiply' as const, night: false, label: 'Atardecer en Reforma' }
  if (h < 9) return { c: 'rgba(255,220,180,.18)', mode: 'soft-light' as const, night: false, label: 'Amanece en la ciudad' }
  return { c: 'transparent', mode: 'normal' as const, night: false, label: 'Día soleado en la CDMX' }
}

// pétalos de jacaranda y sombras de nubes sobre la portada
function Petals ({ night }: { night: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!
    let w = 0; let h = 0
    const fit = () => { w = cv.width = cv.clientWidth; h = cv.height = cv.clientHeight }
    fit(); window.addEventListener('resize', fit)
    const ps = Array.from({ length: 34 }, () => ({ x: Math.random() * 600, y: Math.random() * 900, s: 3 + Math.random() * 4, v: 18 + Math.random() * 22, r: Math.random() * 6, vr: (Math.random() - 0.5) * 2 }))
    const clouds = Array.from({ length: 3 }, (_, i) => ({ x: Math.random() * 600, y: 120 + i * 260, r: 140 + Math.random() * 80, v: 8 + Math.random() * 6 }))
    let raf = 0; let last = performance.now()
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t
      ctx.clearRect(0, 0, w, h)
      for (const c of clouds) {
        c.x += c.v * dt; if (c.x - c.r > w) c.x = -c.r
        ctx.fillStyle = night ? 'rgba(0,0,0,.05)' : 'rgba(20,30,50,.08)'; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.45, 0, 0, 7); ctx.fill()
      }
      if (!night) for (const p of ps) {
        p.y += p.v * dt; p.x += p.v * 0.6 * dt + Math.sin(t / 700 + p.r) * 0.3; p.r += p.vr * dt
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w - 100 }
        if (p.x > w + 10) p.x = -10
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = 'rgba(155,95,210,.85)'
        ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 7); ctx.fill(); ctx.restore()
      }
      if (night) for (let i = 0; i < 14; i++) { // luces de ventanas que titilan
        const x = (i * 97) % w; const y = h * 0.35 + ((i * 53) % (h * 0.4)); const a = 0.35 + 0.3 * Math.sin(t / 900 + i)
        const g = ctx.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, `rgba(255,214,120,${a})`); g.addColorStop(1, 'rgba(255,214,120,0)')
        ctx.fillStyle = g; ctx.fillRect(x - 26, y - 26, 52, 52)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit) }
  }, [night])
  return <canvas ref={ref} className='absolute inset-0 w-full h-full pointer-events-none' aria-hidden />
}

export function Portada () {
  const game = useApp(s => s.game)
  const [step, setStep] = useState<'menu' | 'nueva'>('menu')
  const [modal, setModal] = useState<'partidas' | 'logros' | 'ajustes' | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const tint = useMemo(dayTint, [])
  // parallax: el fondo se mueve un poco con el dedo o al inclinar el teléfono
  useEffect(() => {
    const on = (e: DeviceOrientationEvent) => setTilt({ x: Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30)), y: Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 30)) })
    window.addEventListener('deviceorientation', on)
    return () => window.removeEventListener('deviceorientation', on)
  }, [])
  if (step === 'nueva') return <NuevaEmpresa onBack={() => setStep('menu')} />
  const week = game ? Math.floor(E.dayOf(game.minute) / 7) + 1 : 0
  const play = () => { sfx.good(); setLeaving(true); setTimeout(() => useApp.getState().setTitle(false), 550) }
  const who = (() => { try { return localStorage.getItem(PLAYER_KEY) } catch { return null } })()
  const news = who ? `Hola, ${who} · ${tint.label}` : game ? `${tint.label} · ${game.stores.length} tienda${game.stores.length === 1 ? '' : 's'} abiertas` : tint.label
  return (
    <div className={`relative min-h-[100dvh] max-w-[620px] mx-auto overflow-hidden bg-[#E9DFC9] ${leaving ? 'leave' : ''}`}
      onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: (e.clientX - r.left) / r.width * 2 - 1, y: (e.clientY - r.top) / r.height * 2 - 1 }) }}>
      <div className='absolute -inset-6 transition-transform duration-300' style={{ transform: `translate(${-tilt.x * 10}px, ${-tilt.y * 10}px)` }}>
        <img src={assetUrl('ui/portada.webp')} alt='' className='kenburns absolute inset-0 w-full h-full object-cover' draggable={false} />
        <div className='absolute inset-0' style={{ background: tint.c, mixBlendMode: tint.mode }} />
      </div>
      {getPrefs().petals && <Petals night={tint.night} />}
      <div className={`relative min-h-[100dvh] flex flex-col justify-between px-5 pt-[calc(20px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))] transition-all duration-500 ${leaving ? 'opacity-0' : ''}`}>
        <div className='flex items-center justify-between gap-2 rise-in'>
          <span className='bg-urbano/75 text-white text-xs font-semibold rounded-full px-3 py-1.5 backdrop-blur'>{news}</span>
          <button aria-label='Sonido' onClick={() => { muteAll(soundOn(), setSound); sfx.click(); setModal(null) }} className='w-11 h-11 rounded-full bg-urbano/80 text-white grid place-items-center'><img src={assetUrl('ui/pi-altavoz_sonido.webp')} alt='' className={`w-7 h-7 object-contain ${soundOn() ? '' : 'opacity-40 grayscale'}`} /></button>
        </div>
        {/* el logo flota libre en el tercio de arriba para dejar ver la glorieta */}
        <div className={`mx-auto text-center drop-in mt-6 transition-transform duration-500 ${leaving ? '-translate-y-40' : ''}`}>
          <div className='floaty'>
            <div className='flex justify-center gap-1 mb-1'>{['#D63B2F', '#F2B705', '#D63B2F', '#F2B705', '#D63B2F'].map((c, i) => <span key={i} className='w-7 h-3.5 rounded-b-full shadow' style={{ background: c }} />)}</div>
            <h1 className='font-display uppercase leading-[.9] text-[54px] text-white' style={{ WebkitTextStroke: '2px #2B2D33', textShadow: '0 4px 0 #2B2D33, 0 8px 18px rgba(0,0,0,.35)' }}>
              Tienda <span className='text-rojo'>MX</span> <span className='relative inline-block overflow-hidden text-oferta shine'>Inc.</span>
            </h1>
            <span className='inline-block mt-2 text-[11px] font-bold tracking-wider uppercase bg-urbano text-white rounded-full px-3 py-0.5 shadow'>Imperio retail en México</span>
            <span className='block mt-1.5 text-[10px] font-bold tracking-[.2em] uppercase text-white' style={{ textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>Hecho por API Games</span>
          </div>
        </div>
        <div className='flex-1' />
        <div className={`flex flex-col gap-3 transition-transform duration-500 ${leaving ? 'translate-y-[120%]' : ''}`}>
          {game && (
            <button onClick={play} className='press rise-in bg-rojo text-white rounded-2xl px-4 py-3 flex items-center gap-3 text-left' style={{ animationDelay: '.7s', ['--lip' as string]: '#8E2219' }}>
              <span className='flex-1'><b className='block text-xl'>Continuar partida</b><span className='text-xs opacity-85 num'>{game.company} · Semana {week} · {fmt(game.cash)} MXN</span></span><Play size={26} fill='white' className='nudge' />
            </button>
          )}
          <button onClick={() => { sfx.click(); setStep('nueva') }} className={`press rise-in ${game ? 'bg-urbano' : 'bg-rojo'} text-white rounded-2xl px-4 py-3.5 text-xl font-bold`} style={{ animationDelay: '.78s', ['--lip' as string]: game ? '#111' : '#8E2219' }}>Nueva empresa</button>
          <div className='grid grid-cols-3 gap-2'>
            {([['partidas', 'disquete_guardar', 'Partidas'], ['logros', 'trofeo_dorado', 'Logros'], ['ajustes', 'engrane_ajustes', 'Ajustes']] as const).map(([k, ic, l], i) => (
              <button key={k} onClick={() => { sfx.click(); setModal(k) }} className='press rise-in bg-white/90 rounded-2xl flex flex-col items-center gap-0.5 py-2 text-xs font-semibold text-urbano' style={{ animationDelay: `${0.86 + i * 0.07}s` }}><img src={assetUrl(`ui/pi-${ic}.webp`)} alt='' className='w-9 h-9 object-contain' />{l}</button>
            ))}
          </div>
        </div>
      </div>
      {modal === 'partidas' && <Partidas onClose={() => setModal(null)} />}
      {modal === 'logros' && <Logros onClose={() => setModal(null)} />}
      {modal === 'ajustes' && <Ajustes onClose={() => setModal(null)} />}
    </div>
  )
}

function Section ({ t, children }: { t: string; children: React.ReactNode }) { return <section className='flex flex-col gap-2'><h2 className='font-bold text-lg'>{t}</h2>{children}</section> }

// personajes: los dibujados primero; los avatares de tono de piel completan la lista
export const CHARACTERS: { id: string; name: string; img?: string; skin?: string; founder: 'h' | 'm' }[] = [
  { id: 'beto', name: 'Don Beto', img: 'ui/fundador-h.webp', founder: 'h' },
  { id: 'rosa', name: 'Doña Rosa', img: 'ui/fundador-m.webp', founder: 'm' },
  { id: 'ramiro', name: 'Ramiro', img: 'ui/gerente-0-0.webp', founder: 'h' },
  { id: 'lupita', name: 'Lupita', img: 'ui/gerente-1-0.webp', founder: 'm' },
  { id: 'kevin', name: 'Kevin', img: 'ui/gerente-2-0.webp', founder: 'h' },
  { id: 'carmen', name: 'Doña Carmen', img: 'ui/gerente-3-0.webp', founder: 'm' },
  ...['Joaquín', 'Doña Mary', 'Ing. Sofía', 'Chef Toño', 'Don Pancho', 'Diego', 'Lic. Valeria', 'Beto Express', 'Itzel', 'Don Ernesto', 'Fer', 'Raúl'].map((n, i) => ({ id: `pj-${i}`, name: n, img: `ui/pj-${i}.webp`, founder: ([1, 2, 6, 8, 10].includes(i) ? 'm' : 'h') as 'h' | 'm' })),
  ...SKINS.map((c, i) => ({ id: `avatar-${i}`, name: ['Toño', 'Paty', 'Memo', 'Xime', 'Chuy'][i], skin: c, founder: (i % 2 ? 'm' : 'h') as 'h' | 'm' }))
]
// capital inicial: los dos primeros son gratis; el modo inversionista se desbloquea con un pago único
const CAPITALS = [
  { id: 'calle', label: 'Desde la calle', amount: 6000, desc: 'Ciudad al azar y un puesto ambulante. El reto real.', icon: 'ui/logo-carrito.webp' },
  { id: 'normal', label: 'Emprendedor', amount: 500000, desc: 'Tu tiendita en la CDMX con ahorros y un crédito.', icon: 'ui/ic-tiendas.webp' }
]
// paquetes de inversionista: mientras más grande, más rinde cada peso y trae extras
// (precio por millón: 10M $2.00 · 20M $1.75 · 40M $1.50 · 80M $1.24 · 100M $1.19)
export const PACKS = [
  { id: 'p10', amount: 10_000_000, price: 20, cities: [] as string[], extra: 'Arranque sólido en la CDMX.' },
  { id: 'p20', amount: 20_000_000, price: 35, cities: ['pue'], extra: 'Puebla ya abierta.' },
  { id: 'p40', amount: 40_000_000, price: 60, cities: ['pue', 'qro', 'gdl'], extra: 'Puebla, Querétaro y Guadalajara abiertas.' },
  { id: 'p80', amount: 80_000_000, price: 99, cities: ['pue', 'qro', 'gdl', 'mty', 'mer'], extra: '5 ciudades abiertas, incluidas Monterrey y Mérida.' },
  { id: 'p100', amount: 100_000_000, price: 119, cities: ['pue', 'qro', 'gdl', 'mty', 'mer', 'tij', 'oax', 'aca', 'pach', 'ver'], extra: 'Todo México abierto desde el día 1.' }
]
export const PLAYER_KEY = 'tienda-mx-jugador'
export const PREMIUM_KEY = 'tienda-mx-premium'
// por ahora el modo inversionista es gratis para todos (el cobro llegará después)
export const isPremium = () => true

function NuevaEmpresa ({ onBack }: { onBack: () => void }) {
  const has = useApp(s => !!s.game)
  const [name, setName] = useState('Tienda MX Inc.')
  const [icon, setIcon] = useState('marca-carrito'); const [color, setColor] = useState(COLORS[0])
  const [who, setWho] = useState('rosa'); const [perk, setPerk] = useState<'ventas' | 'logistica'>('ventas')
  const [cap, setCap] = useState('normal'); const [vip, setVip] = useState(5_000_000); const [pay, setPay] = useState(false)
  const [diff, setDiff] = useState<Difficulty>('normal')
  const [confirm, setConfirm] = useState(false)
  const ch = CHARACTERS.find(c => c.id === who)!
  const premium = isPremium()
  const start = () => {
    const pk = PACKS.find(p => p.id === cap)
    const capital = pk ? pk.amount : cap === 'vip' ? vip : CAPITALS.find(c => c.id === cap)!.amount
    const profile: CompanyProfile = { icon, color, founder: ch.founder, perk, difficulty: diff, street: cap === 'calle', age: 22, skin: ch.skin ?? SKINS[2], character: ch.id, capital, bonusCities: pk?.cities }
    sfx.good(); useApp.getState().newGame(name.trim() || 'Tienda MX Inc.', 2027, profile)
  }
  const card = (on: boolean) => `rounded-2xl border-2 bg-white ${on ? 'border-rojo shadow-card' : 'border-borde'}`
  // inicio deslizable: cada paso es una página; para agregar un paso basta con sumarlo a esta lista
  const [player, setPlayer] = useState(() => { try { return localStorage.getItem(PLAYER_KEY) ?? '' } catch { return '' } })
  const pages: { t: string; body: React.ReactNode }[] = [
    { t: 'Inicia sesión', body: (
      <Section t='Bienvenido a Tienda MX Inc.'>
        <p className='text-sm text-tenue'>Crea tu perfil de jugador para guardar tus partidas y logros en este teléfono.</p>
        <input value={player} maxLength={24} onChange={e => setPlayer(e.target.value)} placeholder='Tu nombre de jugador' aria-label='Nombre de jugador' className='bg-white border border-borde rounded-xl px-3 py-3 text-lg min-h-[48px]' />
        <Btn onClick={() => { try { localStorage.setItem(PLAYER_KEY, player.trim()) } catch { /* sin almacenamiento */ } go(1) }} className='min-h-[52px]'>{player.trim() ? `Entrar como ${player.trim()}` : 'Entrar como invitado'} →</Btn>
        <p className='text-[11px] text-tenue text-center'>Pronto: inicia sesión con Google o Apple para jugar en varios dispositivos.</p>
      </Section>) },
    { t: 'Personaje', body: <>      <Section t='¿Quién eres?'>
        <div className='grid grid-cols-3 gap-2.5'>
          {CHARACTERS.map(c => (
            <button key={c.id} onClick={() => setWho(c.id)} className={`${card(who === c.id)} p-1.5 flex flex-col items-center gap-0.5`}>
              {c.img ? <img src={assetUrl(c.img)} alt='' className='w-20 h-20 object-contain rounded-full bg-arena' /> : <Avatar skin={c.skin!} age={22} shirt={color} size={64} />}
              <b className='text-[11.5px] leading-tight text-center'>{c.name}</b>
            </button>))}
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {([['ventas', 'Comercial', '+10 % clientes'], ['logistica', 'Operaciones', '−5 % costo de mercancía']] as const).map(([k, l, d]) => (
            <button key={k} onClick={() => setPerk(k)} className={`${card(perk === k)} p-3 text-left`}><b className='block'>{l}</b><span className='text-xs text-tenue'>{d}</span></button>))}
        </div>
      </Section>
</> },
    { t: 'Marca', body: <>      <Section t='Tu marca'>
        <input value={name} maxLength={40} onChange={e => setName(e.target.value)} aria-label='Nombre de la empresa' className='bg-white border border-borde rounded-xl px-3 py-3 text-lg min-h-[48px]' />
        <div className='grid grid-cols-5 gap-2'>
          {ICONS.map(i => <button key={i} aria-label={`Logo ${i}`} onClick={() => setIcon(i)} className={`${card(icon === i)} p-1.5 aspect-square`}><img src={assetUrl(`ui/logo-${i}.webp`)} alt='' className='w-full h-full object-contain' /></button>)}
        </div>
        <div className='flex justify-between'>
          {COLORS.map(c => <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`w-11 h-11 rounded-full ${color === c ? 'ring-4 ring-offset-2 ring-urbano/40' : ''}`} style={{ background: c }} />)}
        </div>
      </Section>
</> },
    { t: 'Capital', body: <>      <Section t='Capital inicial'>
        {CAPITALS.map(c => (
          <button key={c.id} onClick={() => setCap(c.id)} className={`${card(cap === c.id)} p-3 flex items-center gap-3 text-left`}>
            <img src={assetUrl(c.icon)} alt='' className='w-10 h-10 object-contain' /><span className='flex-1'><b className='block'>{c.label} · ${c.amount.toLocaleString('es-MX')}</b><span className='text-xs text-tenue'>{c.desc}</span></span>
          </button>))}
        <div className={`${card(cap === 'vip')} p-3 flex flex-col gap-2`}>
          <button onClick={() => (premium ? setCap('vip') : setPay(true))} className='flex items-center gap-3 text-left'>
            <img src={assetUrl('ui/ic-premium.webp')} alt='' className='w-10 h-10 object-contain' />
            <span className='flex-1'><b className='block'>Inversionista {premium ? '' : '🔒'}</b><span className='text-xs text-tenue'>Elige tu capital, hasta $10,000,000.</span></span>
          </button>
          {premium && cap === 'vip' && <label className='text-sm font-semibold'>Capital: ${vip.toLocaleString('es-MX')}
            <input type='range' min={1_000_000} max={10_000_000} step={500_000} value={vip} onChange={e => setVip(+e.target.value)} className='w-full' /></label>}
        </div>
        <b className='text-sm mt-1'>Paquetes Pro</b>
        {PACKS.map((p, i) => {
          const perM = p.price / (p.amount / 1e6); const save = Math.round((1 - perM / 2) * 100)
          return (
            <button key={p.id} onClick={() => setCap(p.id)} className={`${card(cap === p.id)} p-3 flex items-center gap-3 text-left relative`}>
              {i === 4 && <span className='absolute -top-2 right-3 bg-oferta text-white text-[10px] font-black rounded-full px-2 py-0.5'>MEJOR VALOR</span>}
              <span className='w-12 h-12 rounded-full bg-urbano text-white grid place-items-center font-black text-sm shrink-0'>{p.amount / 1e6}M</span>
              <span className='flex-1'><b className='block'>${p.amount.toLocaleString('es-MX')}</b><span className='text-xs text-tenue'>{p.extra}{save > 0 ? ` · ahorras ${save} % por millón` : ''}</span></span>
              <span className='text-right'><b className='block text-lg'>${p.price}</b><span className='text-[10px] text-tenue'>MXN pago único</span></span>
            </button>)
        })}
        <p className='text-[11px] text-tenue'>Por ahora los paquetes Pro están abiertos gratis para probar; el cobro se activa al lanzar.</p>
      </Section>
</> },
    { t: 'Reto', body: <>      <Section t='Dificultad del reto'>
        <div className='grid grid-cols-3 gap-2'>
          {(Object.keys(E.DIFFICULTY) as Difficulty[]).map(k => (
            <button key={k} onClick={() => setDiff(k)} className={`${card(diff === k)} p-2.5 text-left`}><b className='block text-sm'>{E.DIFFICULTY[k].label}</b><span className='text-[11px] text-tenue leading-tight block'>{E.DIFFICULTY[k].rivalsDesc}</span></button>))}
        </div>
      </Section>
      <Btn onClick={() => (has ? setConfirm(true) : start())} className='text-xl min-h-[56px]'>Iniciar imperio →</Btn></> }
  ]
  const track = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const go = (n: number) => { const el = track.current; if (!el) return; sfx.click(); el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' }) }
  return (
    <div className='max-w-[560px] mx-auto h-[100dvh] flex flex-col pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(12px+env(safe-area-inset-bottom))]'>
      <div className='flex items-center gap-2 px-4'>
        <button onClick={() => (page ? go(page - 1) : onBack())} aria-label='Volver' className='w-11 h-11 rounded-full bg-white border border-borde grid place-items-center'><ArrowLeft size={22} /></button>
        <h1 className='font-display text-2xl uppercase flex-1'>{pages[page].t}</h1>
        <span className='text-xs text-tenue font-semibold'>{page + 1} / {pages.length}</span>
      </div>
      <div className='flex justify-center gap-1.5 py-2'>{pages.map((p, i) => <button key={p.t} onClick={() => go(i)} aria-label={p.t} className={`h-2 rounded-full transition-all ${i === page ? 'w-6 bg-rojo' : 'w-2 bg-borde'}`} />)}</div>
      <div ref={track} onScroll={e => { const el = e.currentTarget; setPage(Math.round(el.scrollLeft / el.clientWidth)) }} className='flex-1 flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none]'>
        {pages.map(p => <div key={p.t} className='w-full shrink-0 snap-center overflow-y-auto px-4 pb-4 flex flex-col gap-4'>{p.body}</div>)}
      </div>
      {page > 0 && page < pages.length - 1 && <div className='px-4'><Btn onClick={() => go(page + 1)} className='w-full min-h-[52px]'>Siguiente →</Btn></div>}
      {confirm && <Modal title='¿Empezar de nuevo?' onClose={() => setConfirm(false)}>
        <p className='text-sm'>Tu partida actual se reemplaza. Si quieres conservarla, expórtala primero en Partidas.</p>
        <Btn onClick={start}>Sí, nueva empresa</Btn>
      </Modal>}
      {pay && <Modal title='Modo inversionista' onClose={() => setPay(false)}>
        <p className='text-sm'>Empieza con el capital que quieras, hasta <b>$10,000,000</b>, por un pago único de <b>$20 MXN</b>.</p>
        <p className='text-sm text-tenue'>Los pagos con tarjeta y OXXO se activan pronto. Mientras tanto puedes jugar gratis desde la calle o como emprendedor.</p>
        <Btn kind='ghost' onClick={() => setPay(false)}>Entendido</Btn>
      </Modal>}
    </div>
  )
}

function Partidas ({ onClose }: { onClose: () => void }) {
  const game = useApp(s => s.game)
  const file = useRef<HTMLInputElement>(null)
  const copy = async () => { if (!game) return; try { await navigator.clipboard.writeText(E.serialize(game)); useApp.getState().say('Partida copiada: pégala en tus notas para guardarla') } catch { useApp.getState().say('No se pudo copiar', true) } }
  const paste = async () => { try { useApp.getState().importGame(await navigator.clipboard.readText()) } catch { useApp.getState().say('No se pudo leer el portapapeles', true) } }
  return (
    <Modal title='Partidas' onClose={onClose}>
      <p className='text-sm'>{game ? <>Partida actual: <b>{game.company}</b>, {game.stores.length} tiendas.</> : 'No hay partida guardada.'} Se guarda sola en este dispositivo.</p>
      <div className='grid grid-cols-2 gap-2'>
        <Btn kind='ghost' disabled={!game} onClick={copy}>Copiar partida</Btn>
        <Btn kind='ghost' onClick={paste}>Pegar partida</Btn>
        <Btn kind='ghost' onClick={() => file.current?.click()} className='col-span-2'>Cargar archivo .json</Btn>
      </div>
      <input ref={file} type='file' accept='application/json,.json' className='hidden' onChange={async e => { const f = e.target.files?.[0]; if (f) useApp.getState().importGame(await f.text()); e.target.value = '' }} />
    </Modal>
  )
}

export const ACHIEVEMENTS: { id: string; icon: string; name: string; desc: string; ok: (g: GameState) => boolean }[] = [
  { id: 'primera', icon: '🏪', name: 'Primer changarro', desc: 'Abre tu primera tienda', ok: g => g.stores.length >= 1 },
  { id: 'corte', icon: '💰', name: 'Primer corte', desc: 'Termina un día con utilidad', ok: g => g.reports.some(r => r.profit > 0) },
  { id: 'cinco', icon: '🏘️', name: 'Cadena de barrio', desc: 'Ten 5 tiendas', ok: g => g.stores.length >= 5 },
  { id: 'cedis', icon: '🚚', name: 'Logística propia', desc: 'Construye tu CEDIS', ok: g => !!g.cedis },
  { id: 'marca', icon: '🏷️', name: 'Marca propia', desc: 'Lanza una línea de marca propia', ok: g => g.labels.length > 0 },
  { id: 'viaje', icon: '✈️', name: 'Expansión nacional', desc: 'Abre otra ciudad', ok: g => g.cities.length >= 2 },
  { id: 'diez', icon: '🏙️', name: 'Diez tiendas', desc: 'Ten 10 tiendas', ok: g => g.stores.length >= 10 },
  { id: 'sede', icon: '🏢', name: 'Sede corporativa', desc: 'Múdate a una oficina', ok: g => (g.office ?? 0) >= 1 },
  { id: 'millon', icon: '💎', name: 'Millonario', desc: 'Patrimonio de $10 M (pesos de hoy)', ok: g => E.netWorth(g) >= 10e6 },
  { id: 'treinta', icon: '👑', name: 'Imperio', desc: 'Ten 30 tiendas', ok: g => g.stores.length >= 30 }
]
function Logros ({ onClose }: { onClose: () => void }) {
  const game = useApp(s => s.game)
  const got = game ? ACHIEVEMENTS.filter(a => a.ok(game)).length : 0
  return (
    <Modal title={`Logros · ${got}/${ACHIEVEMENTS.length}`} onClose={onClose}>
      <div className='grid grid-cols-2 gap-2'>
        {ACHIEVEMENTS.map(a => { const ok = !!game && a.ok(game); return (
          <div key={a.id} className={`rounded-xl border p-2.5 ${ok ? 'bg-oferta/20 border-oferta' : 'bg-white border-borde opacity-60'}`}>
            <img src={assetUrl(`ui/medalla-${ACHIEVEMENTS.indexOf(a)}.webp`)} alt='' className={`w-12 h-12 ${ok ? '' : 'grayscale opacity-60'}`} /><b className='block text-sm'>{a.name}</b><span className='text-[11px] text-tenue'>{a.desc}</span>
          </div>) })}
      </div>
    </Modal>
  )
}
export function Ajustes ({ onClose }: { onClose: () => void }) {
  const pr = usePrefs()
  const [s, setS] = useState(sfxVolume())
  const [vol, setVol] = useState(musicVolume())
  return (
    <Modal title='Ajustes' onClose={onClose}>
      <button onClick={() => { const m = s > 0 || vol > 0; muteAll(m, setSound); setS(m ? 0 : sfxVolume() || 0.8); if (!m) setSfxVolume(0.8); setVol(musicVolume()) }} className='flex items-center gap-3 bg-white border border-borde rounded-xl px-3 min-h-[48px] font-semibold'>
        <img src={assetUrl('ui/pi-altavoz_sonido.webp')} alt='' className={`w-8 h-8 object-contain ${s > 0 || vol > 0 ? '' : 'grayscale opacity-40'}`} />{s > 0 || vol > 0 ? 'Silenciar todo' : 'Activar sonido'}
      </button>
      <label className='flex items-center gap-3 bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span className='font-semibold'>Efectos</span>
        <input type='range' min={0} max={1} step={0.05} value={s} onChange={e => { setSfxVolume(+e.target.value); setS(+e.target.value); sfx.click() }} className='flex-1' aria-label='Volumen de los efectos' />
      </label>
      <label className='flex items-center gap-3 bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span className='font-semibold'>Música</span>
        <input type='range' min={0} max={1} step={0.05} value={vol} onChange={e => { setMusicVolume(+e.target.value); setVol(+e.target.value) }} className='flex-1' aria-label='Volumen de la música' />
      </label>
      <label className='flex items-center justify-between bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span className='font-semibold'>Nombres de colonias en el mapa</span>
        <input type='checkbox' checked={pr.labels} onChange={e => setPrefs({ labels: e.target.checked })} className='w-6 h-6 accent-rojo' />
      </label>
      <div className='bg-white border border-borde rounded-xl px-3 py-2 flex flex-col gap-1.5'>
        <span className='font-semibold'>Tráfico en las calles</span>
        <div className='grid grid-cols-3 gap-2'>{([[0.5, 'Ligero'], [1, 'Normal'], [1.6, 'Hora pico']] as const).map(([v, l]) => <button key={l} onClick={() => setPrefs({ traffic: v })} className={`rounded-lg py-2 text-sm font-semibold ${pr.traffic === v ? 'bg-rojo text-white' : 'bg-arena'}`}>{l}</button>)}</div>
        <span className='text-[11px] text-tenue'>Menos tráfico = el juego va más fluido en teléfonos viejos.</span>
      </div>
      <label className='flex items-center justify-between bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span><b className='block'>Modo ligero</b><span className='text-[11px] text-tenue'>Para teléfonos con poca memoria (se activa solo si el juego se cerró)</span></span>
        <input type='checkbox' checked={!!pr.lite} onChange={e => setPrefs({ lite: e.target.checked, ...(e.target.checked ? { traffic: 0.5, petals: false } : {}) })} className='w-6 h-6 accent-rojo' />
      </label>
      <label className='flex items-center justify-between bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span className='font-semibold'>Pétalos y nubes en la portada</span>
        <input type='checkbox' checked={pr.petals} onChange={e => setPrefs({ petals: e.target.checked })} className='w-6 h-6 accent-rojo' />
      </label>
      <Btn kind='ghost' onClick={() => { useApp.getState().run(g => { g.tutorial = 0; return { ok: true, msg: 'La guía empieza de nuevo' } }) }}>Reiniciar guía</Btn>
      <p className='text-xs text-tenue'>Espacio = pausa · los datos se guardan en este dispositivo.</p>
    </Modal>
  )
}
