// Piezas de interfaz compartidas: tarjetas, KPIs, botones, gráficas y modal.
import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { useApp, fmtK } from '../../state/store'

export function Card ({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-borde rounded-2xl shadow-card p-4 flex flex-col gap-3 min-w-0 ${className}`}>
      {title && <div className='flex items-center gap-3'><h3 className='text-[11px] font-semibold uppercase tracking-[.09em] text-tenue'>{title}</h3><div className='flex-1 h-px bg-borde' />{right}</div>}
      {children}
    </section>
  )
}
export function Kpi ({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'bad' | 'warn' }) {
  const c = tone === 'good' ? 'text-ahorro' : tone === 'bad' ? 'text-rojo' : tone === 'warn' ? 'text-[#B88900]' : 'text-urbano'
  return (
    <div className='bg-arena border border-borde rounded-xl px-3 py-2 min-w-0'>
      <div className='text-[10.5px] uppercase tracking-wider text-tenue truncate'>{label}</div>
      <div className={`num font-bold text-[17px] truncate ${c}`}>{value}</div>
    </div>
  )
}
type BtnKind = 'primary' | 'ghost' | 'blue' | 'green' | 'gold'
export function Btn ({ children, onClick, kind = 'primary', disabled, small, className = '', title }: { children: ReactNode; onClick?: () => void; kind?: BtnKind; disabled?: boolean; small?: boolean; className?: string; title?: string }) {
  const k = { primary: 'bg-rojo text-white', ghost: 'bg-arena text-urbano border border-borde', blue: 'bg-corp text-white', green: 'bg-ahorro text-white', gold: 'bg-oferta text-urbano' }[kind]
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`${k} ${small ? 'px-3 py-1.5 text-[13px] min-h-[34px]' : 'px-4 py-2.5 min-h-[42px]'} rounded-xl font-semibold inline-flex items-center justify-center gap-1.5 transition active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  )
}
export function Pill ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' | 'blue' }) {
  const c = { neutral: 'bg-arena text-tenue', good: 'bg-ahorro/10 text-ahorro', bad: 'bg-rojo/10 text-rojo', warn: 'bg-oferta/20 text-[#8A6600]', blue: 'bg-corp/10 text-corp' }[tone]
  return <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${c}`}>{children}</span>
}
export function Stars ({ n, max = 5 }: { n: number; max?: number }) {
  const full = Math.round(n)
  return <span className='text-oferta tracking-tight whitespace-nowrap' aria-label={`${n.toFixed(1)} de ${max} estrellas`}>{'★'.repeat(full)}<span className='text-borde'>{'★'.repeat(max - full)}</span></span>
}
export function Bar ({ value, color = '#2E7D5B' }: { value: number; color?: string }) {
  return <div className='h-2 rounded-full bg-arena border border-borde overflow-hidden'><div className='h-full rounded-full transition-all' style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color }} /></div>
}

// barras verticales simples a escala, con etiqueta del máximo
export function BarChart ({ values, labels, color = '#D63B2F', height = 110 }: { values: number[]; labels?: string[]; color?: string; height?: number }) {
  if (!values.length) return <p className='text-sm text-tenue py-6 text-center'>Aún no hay días cerrados.</p>
  const max = Math.max(...values, 0); const min = Math.min(...values, 0); const span = max - min || 1
  const W = 320; const pad = 14; const bw = (W - 8) / values.length
  const y = (v: number) => pad + (max - v) / span * (height - pad - 14)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className='w-full h-auto' role='img' aria-label='Gráfica de barras'>
      <line x1='0' x2={W} y1={y(0)} y2={y(0)} stroke='#E6E0D4' />
      {values.map((v, i) => (
        <rect key={i} x={4 + i * bw + bw * 0.15} width={bw * 0.7} y={Math.min(y(v), y(0))} height={Math.max(1, Math.abs(y(v) - y(0)))} rx='2' fill={v < 0 ? '#D63B2F' : color} opacity={i === values.length - 1 ? 1 : 0.75} />
      ))}
      <text x='4' y='10' fontSize='10' fill='#6E6A63'>{fmtK(max)}</text>
      {min < 0 && <text x='4' y={height - 2} fontSize='10' fill='#6E6A63'>{fmtK(min)}</text>}
      {labels && values.length > 1 && <><text x='4' y={height - 2} fontSize='10' fill='#6E6A63' textAnchor='start'>{min < 0 ? '' : labels[0]}</text><text x={W - 4} y={height - 2} fontSize='10' fill='#6E6A63' textAnchor='end'>{labels[labels.length - 1]}</text></>}
    </svg>
  )
}

export function Modal ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className='fixed inset-0 z-50 bg-urbano/50 flex items-end sm:items-center justify-center' onClick={onClose}>
      <div role='dialog' aria-modal='true' aria-label={title} onClick={e => e.stopPropagation()}
        className='bg-arena w-full max-w-[560px] max-h-[88vh] overflow-auto rounded-t-3xl sm:rounded-3xl p-4 pb-[calc(16px+env(safe-area-inset-bottom))] flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='font-display text-xl uppercase'>{title}</h2>
          <button onClick={onClose} aria-label='Cerrar' className='w-9 h-9 rounded-full bg-white border border-borde grid place-items-center'><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toast () {
  const toast = useApp(s => s.toast)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => useApp.setState({ toast: null }), 2600)
    return () => clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div role='status' className={`fixed z-[60] left-1/2 -translate-x-1/2 bottom-[calc(84px+env(safe-area-inset-bottom))] max-w-[calc(100%-32px)] px-4 py-2.5 rounded-xl shadow-card font-semibold text-sm ${toast.bad ? 'bg-rojo text-white' : 'bg-urbano text-white'}`}>
      {toast.text}
    </div>
  )
}
