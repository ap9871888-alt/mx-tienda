// Creador de productos (estilo Coffee Inc): desarrollas productos de tu propia marca.
// Cada producto pertenece a una línea (categoría): baja el costo de esa línea y atrae más compras.
import type { CategoryId } from './categories'
import type { FormatId } from './formats'

export interface ProductDef { id: string; name: string; cat: CategoryId; desc: string; only?: FormatId[] }
export const PRODUCTS: ProductDef[] = [
  { id: 'refresco', name: 'Refresco TMX', cat: 'bebidas', desc: 'Cola de 600 ml' },
  { id: 'agua', name: 'Agua purificada', cat: 'bebidas', desc: 'Botella de 1 L' },
  { id: 'galletas', name: 'Galletas con chispas', cat: 'botanas', desc: 'Paquete individual' },
  { id: 'papas', name: 'Papas con chile', cat: 'botanas', desc: 'Bolsa de 45 g' },
  { id: 'leche', name: 'Leche entera', cat: 'panLacteos', desc: 'Cartón de 1 L' },
  { id: 'pan', name: 'Pan de caja', cat: 'panLacteos', desc: 'Grande, 680 g' },
  { id: 'cafe', name: 'Café de Veracruz', cat: 'abarrotes', desc: 'Molido, 250 g' },
  { id: 'detergente', name: 'Detergente líquido', cat: 'abarrotes', desc: 'Galón' },
  { id: 'salsa', name: 'Salsa roja', cat: 'abarrotes', desc: 'Frasco de vidrio' },
  { id: 'tortillas', name: 'Tortillas de maíz', cat: 'panLacteos', desc: 'Paquete de 1 kg' },
  { id: 'helado', name: 'Helado de la casa', cat: 'botanas', desc: 'Bote de 1 L', only: ['paleteria', 'conveniencia', 'bodega'] },
  { id: 'tacos', name: 'Tacos para llevar', cat: 'abarrotes', desc: 'Charola con 4 tacos', only: ['taqueria', 'conveniencia'] }
]
export const QUALITY = [
  { name: 'Básica', cost: 120000, desc: 'Barata de producir, la gente la compra por precio', attract: 0.03, saving: 0.05 },
  { name: 'Estándar', cost: 350000, desc: 'Buena relación calidad-precio', attract: 0.06, saving: 0.04 },
  { name: 'Premium', cost: 900000, desc: 'Empaque y receta de lujo: atrae a quien paga más', attract: 0.1, saving: 0.02 }
]

// equipo que se compra para cada tienda (se ve en el interior)
export interface EquipDef { id: string; name: string; cost: number; desc: string; cat?: CategoryId; boost?: number; only?: FormatId[] }
export const EQUIPMENT: EquipDef[] = [
  { id: 'refri', name: 'Refrigerador de puertas', cost: 45000, desc: '+12 % ventas de bebidas', cat: 'bebidas', boost: 0.12 },
  { id: 'cafetera', name: 'Cafetera de espresso', cost: 60000, desc: '+10 % abarrotes y café', cat: 'abarrotes', boost: 0.1, only: ['conveniencia', 'bodega', 'tiendita'] },
  { id: 'horno', name: 'Horno de pan', cost: 80000, desc: '+15 % pan y lácteos', cat: 'panLacteos', boost: 0.15, only: ['conveniencia', 'bodega', 'hardDiscount'] },
  { id: 'trompo', name: 'Trompo al pastor', cost: 25000, desc: '+20 % tacos', cat: 'abarrotes', boost: 0.2, only: ['taqueria'] },
  { id: 'congelador', name: 'Congelador de paletas', cost: 30000, desc: '+18 % helados y paletas', cat: 'botanas', boost: 0.18, only: ['paleteria', 'conveniencia', 'tiendita'] },
  { id: 'atm', name: 'Cajero automático', cost: 90000, desc: '+5 % clientes que entran a retirar' },
  { id: 'farmacia', name: 'Estante de farmacia', cost: 70000, desc: '+8 % en todas las líneas', only: ['bodega', 'conveniencia'] },
  { id: 'pos', name: 'Caja moderna', cost: 35000, desc: '+12 % rapidez de cobro' }
]
export const equipFor = (formatId: FormatId) => EQUIPMENT.filter(e => !e.only || e.only.includes(formatId))
