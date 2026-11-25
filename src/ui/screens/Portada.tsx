import { useRef, useState } from 'react'
import { ArrowLeft, Play, Save, Trophy, Settings, Volume2, VolumeX } from 'lucide-react'
import * as E from '../../engine'
import { useApp, fmt } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { Btn, Modal } from '../components/kit'
import { sfx, soundOn, setSound } from '../sound'
import { Avatar, SKINS } from '../Avatar'
import { musicVolume, setMusicVolume } from '../music'
import type { CompanyProfile, Difficulty, GameState } from '../../engine/types'

export const ICONS = ['carrito', 'tienda', 'estrella', 'caja', 'boleto']
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

export function Portada () {
  const game = useApp(s => s.game)
  const [step, setStep] = useState<'menu' | 'nueva'>('menu')
  const [modal, setModal] = useState<'partidas' | 'logros' | 'ajustes' | null>(null)
  if (step === 'nueva') return <NuevaEmpresa onBack={() => setStep('menu')} />
  const week = game ? Math.floor(E.dayOf(game.minute) / 7) + 1 : 0
  return (
    <div className='relative min-h-[100dvh] max-w-[620px] mx-auto overflow-hidden bg-[#E9DFC9]'>
      <img src={assetUrl('ui/portada.webp')} alt='' className='absolute inset-0 w-full h-full object-cover' draggable={false} />
      <div className='relative min-h-[100dvh] flex flex-col justify-between px-5 pt-[calc(28px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))]'>
        <div className='flex justify-end gap-2'>
          <button aria-label='Sonido' onClick={() => { setSound(!soundOn()); sfx.click(); setModal(null) }} className='w-11 h-11 rounded-full bg-urbano/80 text-white grid place-items-center'>{soundOn() ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
        </div>
        <div className='mx-auto w-full max-w-[340px] -mt-10'><Logo /></div>
        <div className='bg-white/70 backdrop-blur-md rounded-3xl p-4 flex flex-col gap-3 shadow-card'>
          {game && (
            <button onClick={() => { sfx.good(); useApp.getState().setTitle(false) }} className='bg-rojo text-white rounded-2xl px-4 py-3 flex items-center gap-3 text-left shadow'>
              <span className='flex-1'><b className='block text-xl'>Continuar partida</b><span className='text-xs opacity-85 num'>{game.company} · Semana {week} · {fmt(game.cash)} MXN</span></span><Play size={26} fill='white' />
            </button>
          )}
          <button onClick={() => { sfx.click(); setStep('nueva') }} className={`${game ? 'bg-urbano' : 'bg-rojo'} text-white rounded-2xl px-4 py-3.5 text-xl font-bold shadow`}>Nueva empresa</button>
          <div className='grid grid-cols-3 gap-2 bg-white/80 rounded-2xl p-2'>
            {([['partidas', Save, 'Partidas'], ['logros', Trophy, 'Logros'], ['ajustes', Settings, 'Ajustes']] as const).map(([k, Icon, l]) => (
              <button key={k} onClick={() => { sfx.click(); setModal(k) }} className='flex flex-col items-center gap-0.5 py-1.5 text-xs font-semibold text-urbano'><Icon size={24} />{l}</button>
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
  { id: 'calle', label: 'Desde la calle', amount: 6000, desc: 'Ciudad al azar y un puesto ambulante. El reto real.', icon: '🛒' },
  { id: 'normal', label: 'Emprendedor', amount: 500000, desc: 'Tu tiendita en la CDMX con ahorros y un crédito.', icon: '🏪' }
]
export const PREMIUM_KEY = 'tienda-mx-premium'
export const isPremium = () => { try { return localStorage.getItem(PREMIUM_KEY) === '1' } catch { return false } }

function NuevaEmpresa ({ onBack }: { onBack: () => void }) {
  const has = useApp(s => !!s.game)
  const [name, setName] = useState('Tienda MX Inc.')
  const [icon, setIcon] = useState('carrito'); const [color, setColor] = useState(COLORS[0])
  const [who, setWho] = useState('rosa'); const [perk, setPerk] = useState<'ventas' | 'logistica'>('ventas')
  const [cap, setCap] = useState('normal'); const [vip, setVip] = useState(5_000_000); const [pay, setPay] = useState(false)
  const [diff, setDiff] = useState<Difficulty>('normal')
  const [confirm, setConfirm] = useState(false)
  const ch = CHARACTERS.find(c => c.id === who)!
  const premium = isPremium()
  const start = () => {
    const capital = cap === 'vip' ? vip : CAPITALS.find(c => c.id === cap)!.amount
    const profile: CompanyProfile = { icon, color, founder: ch.founder, perk, difficulty: diff, street: cap === 'calle', age: 22, skin: ch.skin ?? SKINS[2], character: ch.id, capital }
    sfx.good(); useApp.getState().newGame(name.trim() || 'Tienda MX Inc.', 2027, profile)
  }
  const card = (on: boolean) => `rounded-2xl border-2 bg-white ${on ? 'border-rojo shadow-card' : 'border-borde'}`
  return (
    <div className='max-w-[560px] mx-auto px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-10 flex flex-col gap-5'>
      <div className='flex items-center gap-2'>
        <button onClick={onBack} aria-label='Volver' className='w-11 h-11 rounded-full bg-white border border-borde grid place-items-center'><ArrowLeft size={22} /></button>
        <h1 className='font-display text-3xl uppercase flex-1'>Nueva empresa</h1>
      </div>
      <Section t='1 · Tu marca'>
        <input value={name} maxLength={40} onChange={e => setName(e.target.value)} aria-label='Nombre de la empresa' className='bg-white border border-borde rounded-xl px-3 py-3 text-lg min-h-[48px]' />
        <div className='grid grid-cols-5 gap-2'>
          {ICONS.map(i => <button key={i} aria-label={`Logo ${i}`} onClick={() => setIcon(i)} className={`${card(icon === i)} p-1.5 aspect-square`}><img src={assetUrl(`ui/logo-${i}.webp`)} alt='' className='w-full h-full object-contain' /></button>)}
        </div>
        <div className='flex justify-between'>
          {COLORS.map(c => <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`w-11 h-11 rounded-full ${color === c ? 'ring-4 ring-offset-2 ring-urbano/40' : ''}`} style={{ background: c }} />)}
        </div>
      </Section>
      <Section t='2 · Tu personaje'>
        <div className='grid grid-cols-4 gap-2'>
          {CHARACTERS.map(c => (
            <button key={c.id} onClick={() => setWho(c.id)} className={`${card(who === c.id)} p-1.5 flex flex-col items-center gap-0.5`}>
              {c.img ? <img src={assetUrl(c.img)} alt='' className='w-16 h-16 object-contain rounded-full bg-arena' /> : <Avatar skin={c.skin!} age={22} shirt={color} size={64} />}
              <b className='text-[11.5px] leading-tight text-center'>{c.name}</b>
            </button>))}
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {([['ventas', 'Comercial', '+10 % clientes'], ['logistica', 'Operaciones', '−5 % costo de mercancía']] as const).map(([k, l, d]) => (
            <button key={k} onClick={() => setPerk(k)} className={`${card(perk === k)} p-3 text-left`}><b className='block'>{l}</b><span className='text-xs text-tenue'>{d}</span></button>))}
        </div>
      </Section>
      <Section t='3 · Capital inicial'>
        {CAPITALS.map(c => (
          <button key={c.id} onClick={() => setCap(c.id)} className={`${card(cap === c.id)} p-3 flex items-center gap-3 text-left`}>
            <span className='text-3xl'>{c.icon}</span><span className='flex-1'><b className='block'>{c.label} · ${c.amount.toLocaleString('es-MX')}</b><span className='text-xs text-tenue'>{c.desc}</span></span>
          </button>))}
        <div className={`${card(cap === 'vip')} p-3 flex flex-col gap-2`}>
          <button onClick={() => (premium ? setCap('vip') : setPay(true))} className='flex items-center gap-3 text-left'>
            <span className='text-3xl'>💎</span>
            <span className='flex-1'><b className='block'>Inversionista {premium ? '' : '🔒'}</b><span className='text-xs text-tenue'>Elige tu capital hasta $10,000,000. {premium ? 'Desbloqueado.' : 'Pago único de $20 MXN.'}</span></span>
          </button>
          {premium && cap === 'vip' && <label className='text-sm font-semibold'>Capital: ${vip.toLocaleString('es-MX')}
            <input type='range' min={1_000_000} max={10_000_000} step={500_000} value={vip} onChange={e => setVip(+e.target.value)} className='w-full' /></label>}
        </div>
      </Section>
      <Section t='4 · Dificultad del reto'>
        <div className='grid grid-cols-3 gap-2'>
          {(Object.keys(E.DIFFICULTY) as Difficulty[]).map(k => (
            <button key={k} onClick={() => setDiff(k)} className={`${card(diff === k)} p-2.5 text-left`}><b className='block text-sm'>{E.DIFFICULTY[k].label}</b><span className='text-[11px] text-tenue leading-tight block'>{E.DIFFICULTY[k].rivalsDesc}</span></button>))}
        </div>
      </Section>
      <Btn onClick={() => (has ? setConfirm(true) : start())} className='text-xl min-h-[56px]'>Iniciar imperio →</Btn>
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
function Ajustes ({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState(soundOn())
  const [vol, setVol] = useState(musicVolume())
  return (
    <Modal title='Ajustes' onClose={onClose}>
      <label className='flex items-center justify-between bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span className='font-semibold'>Efectos de sonido</span>
        <input type='checkbox' checked={s} onChange={e => { setSound(e.target.checked); setS(e.target.checked); sfx.click() }} className='w-6 h-6 accent-rojo' />
      </label>
      <label className='flex items-center gap-3 bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span className='font-semibold'>Música</span>
        <input type='range' min={0} max={1} step={0.05} value={vol} onChange={e => { setMusicVolume(+e.target.value); setVol(+e.target.value) }} className='flex-1' aria-label='Volumen de la música' />
      </label>
      <Btn kind='ghost' onClick={() => { useApp.getState().run(g => { g.tutorial = 0; return { ok: true, msg: 'La guía empieza de nuevo' } }) }}>Reiniciar guía</Btn>
      <p className='text-xs text-tenue'>Espacio = pausa · los datos se guardan en este dispositivo.</p>
    </Modal>
  )
}
