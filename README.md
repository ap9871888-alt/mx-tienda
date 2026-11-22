# 🏪 Tienda MX Inc. — Hito 1

Simulador empresarial de retail mexicano (business tycoon). Abres una tiendita de esquina en la CDMX y la ves operar en una calle isométrica viva: cada persona que camina hacia tu puerta es un cliente real de la simulación.

## Comandos
```bash
cd tienda-mx
npm install
npm run dev          # desarrollo
npm test             # pruebas del motor (vitest)
npm run typecheck
npm run build        # versión web en dist/
npm run build:single # un solo HTML autocontenido en dist-single/
```

## Arquitectura
| Carpeta | Qué hay |
|---|---|
| `src/engine/` | Motor puro en TypeScript, sin React. Simula minuto a minuto: llegadas por hora (tráfico de la colonia × hora × formato × quincena/fin de semana × reputación × precios), fila en caja con paciencia y abandono arriba de 5 personas, cobro según estrellas del cajero, inventario por categoría, pedidos al mayorista con 6 h de entrega, corte diario (ventas, costo, nómina, renta, luz CFE, merma, servicios, fletes, intereses), rotación de personal, crédito y pronóstico de apertura. Determinista con semilla. |
| `src/renderer/` | Calle viva en Canvas a 60 FPS con `devicePixelRatio`: kit isométrico (cruce, cebras, banquetas, semáforos con ciclo, jacarandas, parada, puesto callejero, casas con tinacos, tienda rival 24/7), sprites procedurales fotograma a fotograma (cliente de 6 fotogramas en 4 direcciones con bolsa al salir, cajero de 4 fotogramas, repartidor con caja y diablito), autos, taxis rosas, vochos, motos, Metrobús y camioneta del mayorista; ciclo día/tarde/noche con luces y cortina metálica; burbujas +$MXN, ⏱️ ¡Fila larga!, 📦 ¡Reabastecer! y ⭐. |
| `src/data/` | CDMX con 4 colonias (Roma-Condesa, Polanco, Coyoacán, Iztapalapa), 5 formatos, categorías, calendario y todas las constantes económicas (`economy.ts`). |
| `src/state/` | Zustand con guardado automático en `localStorage` (con espera), bucle de simulación (1 día = 60 s a 1x; pausa, 1x, 2x, 4x) y bus de eventos motor → renderer. |
| `src/ui/` | React + Tailwind + Lucide. Pestañas: Calle Viva, Mapa, Tienda, Logística y Marca, Corporativo. |

## Balance del Hito 1
Una Tiendita de Esquina ($250,000 de CAPEX) con 2 cajeros de 2 ★ y precios de mercado recupera la inversión en ~4.5 a 7.5 meses según la colonia. Polanco cobra caro pero aguanta precios altos; Iztapalapa tiene mucho tráfico y clientes sensibles al precio. El mapa muestra CAPEX, renta, utilidad estimada y meses de retorno antes de confirmar.

## Siguientes hitos
- **Hito 2**: los otros formatos, CEDIS, flotilla, desabasto y Marca Propia.
- **Hito 3**: mapa nacional, conglomerados con IA (nombres ficticios), BMV, alianzas, guerras de precios, M&A y calendario mexicano completo.
- **Hito 4**: holding del futuro, bienes raíces, tutorial de 60 s y balance fino.

`prototipo/` conserva la versión anterior en HTML/JS como referencia de arte y mecánicas.
