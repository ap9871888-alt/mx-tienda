import { useRef, useState } from 'react'
import { ArrowLeft, Play, Save, Trophy, Settings, Volume2, VolumeX } from 'lucide-react'
import * as E from '../../engine'
import { useApp, fmt } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { START_YEARS } from '../../data/eras'
import { Btn, Modal } from '../components/kit'
import { sfx, soundOn, setSound } from '../sound'
import type { CompanyProfile, Difficulty, GameState } from '../../engine/types'

export const ICONS = ['carrito', 'tienda', 'estrella', 'caja', 'boleto']
export const COLORS = ['#D63B2F', '#E0A100', '#1B4D8F', '#2E7D5B', '#7C4DDB', '#2B2D33']
const ERA_ICON: Record<number, string> = { 1995: 'era-1995', 2000: 'era-1995', 2008: 'era-2010', 2015: 'era-2010', 2019: 'era-2026', 2027: 'era-2026', 2035: 'era-2035' }

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

function NuevaEmpresa ({ onBack }: { onBack: () => void }) {
  const has = useApp(s => !!s.game)
  const [name, setName] = useState('Tienda MX Inc.')
  const [icon, setIcon] = useState('carrito'); const [color, setColor] = useState(COLORS[0])
  const [founder, setFounder] = useState<'h' | 'm'>('m'); const [perk, setPerk] = useState<'ventas' | 'logistica'>('ventas')
  const [year, setYear] = useState(2027); const [diff, setDiff] = useState<Difficulty>('normal')
  const [confirm, setConfirm] = useState(false)
  const start = () => {
    const profile: CompanyProfile = { icon, color, founder, perk, difficulty: diff }
    sfx.good(); useApp.getState().newGame(name.trim() || 'Tienda MX Inc.', year, profile)
  }
  const card = (on: boolean) => `rounded-2xl border-2 bg-white ${on ? 'border-rojo shadow-card' : 'border-borde'}`
  return (
    <div className='max-w-[560px] mx-auto px-4 pt-[calc(16px+env(safe-area-inset-top))] pb-10 flex flex-col gap-5'>
      <div className='flex items-center gap-2'>
        <button onClick={onBack} aria-label='Volver' className='w-11 h-11 rounded-full bg-white border border-borde grid place-items-center'><ArrowLeft size={22} /></button>
        <h1 className='font-display text-3xl uppercase flex-1'>Nueva empresa</h1>
      </div>
      <Section t='Identidad'>
        <input value={name} maxLength={40} onChange={e => setName(e.target.value)} aria-label='Nombre de la empresa' className='bg-white border border-borde rounded-xl px-3 py-3 text-lg min-h-[48px]' />
        <div className='grid grid-cols-5 gap-2'>
          {ICONS.map(i => <button key={i} aria-label={`Logo ${i}`} onClick={() => setIcon(i)} className={`${card(icon === i)} p-1.5 aspect-square`}><img src={assetUrl(`ui/logo-${i}.webp`)} alt='' className='w-full h-full object-contain' /></button>)}
        </div>
        <div className='flex justify-between'>
          {COLORS.map(c => <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className={`w-11 h-11 rounded-full ${color === c ? 'ring-4 ring-offset-2 ring-urbano/40' : ''}`} style={{ background: c }} />)}
        </div>
        <p className='text-xs text-tenue'>Tip de jugadores de tycoon: evita el gris, en el mapa tus tiendas se pierden entre los edificios.</p>
      </Section>
      <Section t='Fundador / CEO'>
        <div className='grid grid-cols-2 gap-3'>
          {(['h', 'm'] as const).map(f => (
            <button key={f} onClick={() => setFounder(f)} className={`${card(founder === f)} p-3 flex flex-col items-center gap-1`}>
              <img src={assetUrl(`ui/fundador-${f}.webp`)} alt='' className='w-24 h-24 rounded-full' /><b>{f === 'h' ? 'Don Beto' : 'Doña Rosa'}</b>
            </button>))}
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {([['ventas', 'Comercial', '+10 % clientes'], ['logistica', 'Operaciones', '−5 % costo de mercancía']] as const).map(([k, l, d]) => (
            <button key={k} onClick={() => setPerk(k)} className={`${card(perk === k)} p-3 text-left`}><b className='block'>{l}</b><span className='text-xs text-tenue'>{d}</span></button>))}
        </div>
      </Section>
      <Section t='Época de inicio'>
        <div className='grid grid-cols-2 gap-3'>
          {START_YEARS.map(y => (
            <button key={y.year} onClick={() => setYear(y.year)} className={`${card(year === y.year)} p-3 flex flex-col items-center text-center gap-1`}>
              <img src={assetUrl(`ui/${ERA_ICON[y.year]}.webp`)} alt='' className='h-12' /><b className='text-sm'>{y.title}</b><span className='text-[11px] text-tenue leading-tight'>{y.desc}</span>
            </button>))}
        </div>
      </Section>
      <Section t='Dificultad'>
        <div className='grid grid-cols-3 gap-2'>
          {(Object.keys(E.DIFFICULTY) as Difficulty[]).map(k => (
            <button key={k} onClick={() => setDiff(k)} className={`${card(diff === k)} p-2.5 text-left`}><b className='block text-sm'>{E.DIFFICULTY[k].label}</b><span className='text-[11px] text-tenue leading-tight block'>{E.DIFFICULTY[k].desc}</span></button>))}
        </div>
      </Section>
      <Btn onClick={() => (has ? setConfirm(true) : start())} className='text-xl min-h-[56px]'>Iniciar imperio →</Btn>
      {confirm && <Modal title='¿Empezar de nuevo?' onClose={() => setConfirm(false)}>
        <p className='text-sm'>Tu partida actual se reemplaza. Si quieres conservarla, expórtala primero en Partidas.</p>
        <Btn onClick={start}>Sí, nueva empresa</Btn>
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
            <span className={`text-2xl ${ok ? '' : 'grayscale'}`}>{a.icon}</span><b className='block text-sm'>{a.name}</b><span className='text-[11px] text-tenue'>{a.desc}</span>
          </div>) })}
      </div>
    </Modal>
  )
}
function Ajustes ({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState(soundOn())
  return (
    <Modal title='Ajustes' onClose={onClose}>
      <label className='flex items-center justify-between bg-white border border-borde rounded-xl px-3 min-h-[48px]'>
        <span className='font-semibold'>Sonidos</span>
        <input type='checkbox' checked={s} onChange={e => { setSound(e.target.checked); setS(e.target.checked); sfx.click() }} className='w-6 h-6 accent-rojo' />
      </label>
      <Btn kind='ghost' onClick={() => { useApp.getState().run(g => { g.tutorial = 0; return { ok: true, msg: 'La guía empieza de nuevo' } }) }}>Reiniciar guía</Btn>
      <p className='text-xs text-tenue'>Espacio = pausa · los datos se guardan en este dispositivo.</p>
    </Modal>
  )
}
