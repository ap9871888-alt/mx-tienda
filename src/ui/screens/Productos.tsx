import { useState } from 'react'
import * as E from '../../engine'
import { useApp, fmtK } from '../../state/store'
import { assetUrl } from '../../renderer/assets'
import { Card, Btn, Modal, Advisor } from '../components/kit'
import { PRODUCTS, QUALITY } from '../../data/products'
import { categoryOf } from '../../data/categories'

// Creador de productos de marca propia
export function Productos () {
  useApp(s => s.rev)
  const game = useApp(s => s.game)!
  const [sel, setSel] = useState<string | null>(null)
  const mine = game.products ?? []
  const d = PRODUCTS.find(p => p.id === sel)
  const cur = mine.find(p => p.id === sel)
  return (
    <div className='flex flex-col gap-3'>
      <h1 className='font-display text-2xl uppercase'>Marca propia</h1>
      <Advisor who='comprador'>Crea productos con tu marca. Cada uno abarata su línea en todas tus tiendas y hace que la gente compre más. Empieza por lo que más se vende: bebidas y botanas.</Advisor>
      <div className='grid grid-cols-3 gap-2'>
        {PRODUCTS.map(p => {
          const m = mine.find(x => x.id === p.id)
          return (
            <button key={p.id} onClick={() => setSel(p.id)} className={`relative rounded-2xl border-2 bg-white p-2 flex flex-col items-center text-center ${m ? 'border-ahorro' : 'border-borde'}`}>
              <img src={assetUrl(`ui/prod-${p.id}.webp`)} alt='' className={`h-16 object-contain ${m ? '' : 'grayscale opacity-60'}`} />
              <b className='text-[12px] leading-tight mt-1'>{p.name}</b>
              <span className='text-[10.5px] text-tenue'>{m ? QUALITY[m.quality].name : 'Sin lanzar'}</span>
              {m && <span className='absolute top-1 right-1 text-[10px] bg-ahorro text-white rounded-full px-1.5'>{'★'.repeat(m.quality + 1)}</span>}
            </button>
          )
        })}
      </div>
      <Card><span className='text-sm'>Tienes <b>{mine.length}</b> de {PRODUCTS.length} productos. Línea más fuerte: <b>{mine.length ? categoryOf(PRODUCTS.find(p => p.id === mine[0].id)!.cat).name : '—'}</b></span></Card>
      {d && (
        <Modal title={d.name} onClose={() => setSel(null)}>
          <div className='flex items-center gap-3'>
            <img src={assetUrl(`ui/prod-${d.id}.webp`)} alt='' className='h-24' />
            <div><b>{d.desc}</b><p className='text-xs text-tenue'>Línea: {categoryOf(d.cat).name}{d.only ? ' · solo en algunos formatos' : ''}</p>
              {cur && <p className='text-xs font-semibold text-ahorro'>Hoy: calidad {QUALITY[cur.quality].name}</p>}</div>
          </div>
          {QUALITY.map((q, i) => {
            const have = !!cur && cur.quality >= i
            const cost = q.cost - (cur ? QUALITY[cur.quality].cost : 0)
            return (
              <div key={q.name} className={`rounded-xl border p-3 flex items-center gap-3 ${have ? 'bg-ahorro/10 border-ahorro' : 'bg-white border-borde'}`}>
                <div className='flex-1'><b className='text-sm'>{'★'.repeat(i + 1)} {q.name}</b><p className='text-xs text-tenue'>{q.desc}. +{Math.round(q.attract * 100)} % compras · −{Math.round(q.saving * 100)} % costo</p></div>
                {have ? <span className='text-xs font-bold text-ahorro'>Listo</span> : <Btn small disabled={game.cash < cost} onClick={() => useApp.getState().run(g => E.createProduct(g, d.id, i))}>{fmtK(cost)}</Btn>}
              </div>
            )
          })}
        </Modal>
      )}
    </div>
  )
}
