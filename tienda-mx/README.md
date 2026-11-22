# 🏪 Tienda MX Inc.

El juego principal: un simulador de negocios en México, **del local al imperio**. Abres tienditas, cafeterías y taquerías, armas tu red de CEDIS, lanzas tu marca propia y tu fintech, y sales a la Bolsa Mexicana.

## Jugar
```bash
cd tienda-mx
npm start   # http://localhost:8080
npm test    # pruebas del motor
```
No necesita compilación. Es una PWA: se instala en el teléfono y funciona sin conexión. La partida se guarda sola (y se puede copiar/pegar como texto).

## Giros de negocio (cada uno con 4 formatos)
| Giro | Formatos |
|---|---|
| 🏪 Tienda | Tiendita de Esquina → Conveniencia 24/7 → Hard Discount → Bodega Express y Farmacia |
| ☕ Cafetería | Kiosco de Café → Café Artesanal Oaxaca → Barra Moderna Polanco → Hacienda Flagship y Tostador |
| 🌮 Taquería | Puesto de Banqueta → Taquería de Barrio → Taquería con Terraza → Taquería Flagship |

En cada colonia puedes tener una sucursal de cada giro. Cada giro tiene su catálogo con precios en barra deslizable, su personal (cajeros, baristas, taqueros) y su ticket promedio. En las taquerías puedes entrar tú al comal: rebanar, armar el salsero como lo pide el cliente y cobrar al momento.

## Las 5 fases (Lógica de crecimiento escalable)
1. **Tienda Piloto**: compras a mayoristas; las tiendas a veces sufren desabasto.
2. **Clúster Urbano**: 8 sucursales en una región. Desbloquea construir CEDIS.
3. **CEDIS Propio**: −25 % en mercancía e insumos para las sucursales que caben en su capacidad; se acaba el desabasto.
4. **Marca Propia y Fintech**: categoría de alto margen, comisiones por pagos y remesas, programa de lealtad. Desbloquea franquicias, adquisiciones de cadenas rivales y salida a bolsa.
5. **Imperio Nacional**: cotizas en la BMV como TMX y operas en las 5 regiones.

## Mapa
Valle de México / Puebla, Guadalajara, Monterrey, Tijuana y Mérida. Cada colonia tiene renta, tráfico, poder adquisitivo y **competencia**.

## Arquitectura
- `js/data.js`: giros, formatos, productos, regiones, fases.
- `js/engine.js`: simulación pura y determinista, probada en `tests/`.
- `js/ui.js`, `styles.css`: interfaz móvil con la paleta de la guía (Rojo Conveniencia, Amarillo Oferta, Azul Corporativo, Verde Ahorro, Gris Urbano).
- `assets/`: arte recortado de las láminas del proyecto. Las taquerías se dibujan en SVG hasta tener su concept art.

## Antes de publicar
- El concept art original trae logos de marcas reales (refrescos y una cadena de descuento): en los recortes están difuminados. Para la versión final conviene encargar arte sin marcas.
- Para Android/iOS: Capacitor con `webDir: "tienda-mx"`. Para PC: Tauri o Electron.
