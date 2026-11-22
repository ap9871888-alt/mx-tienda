# 🏪 Tienda MX Inc. — Hito 2

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

## Balance
Una Tiendita de Esquina ($250,000 de CAPEX) con 2 cajeros de 2 ★ y precios de mercado recupera la inversión en ~4.5 a 7.5 meses según la colonia. Polanco cobra caro pero aguanta precios altos; Iztapalapa tiene mucho tráfico y clientes sensibles al precio. El mapa muestra CAPEX, renta, utilidad estimada y meses de retorno antes de confirmar.

## Hito 2: escala y logística
- **4 formatos**: Tiendita de Esquina, Conveniencia 24/7 (nunca cierra, precios altos, clientes poco sensibles al precio), Hard Discount (precios bajos, ticket 2.4×, la Marca Propia le da más lealtad) y Bodega Express y Farmacia (ticket alto). Cada uno con fachada propia en la calle viva. En el mapa ves CAPEX, renta, utilidad y retorno de cada formato en cada colonia; recuperan la inversión en ~5 a 11 meses.
- **Canibalización**: varias tiendas propias en la misma colonia se reparten el tráfico (−15 % por cada una).
- **Fase 2, Clúster Urbano**: con 4 tiendas compras 8 % más barato.
- **CEDIS propio** (10 tiendas o $12 M de patrimonio): inventario 22 % más barato (26 % y 30 % al ampliarlo), sin flete del mayorista y resurtido en 3 h. La flotilla tiene viajes limitados por día; si se satura, los pedidos salen al día siguiente y hay desabasto. En la calle llega el camión azul del CEDIS; con mayorista, el blanco.
- **Marca Propia** (requiere CEDIS): agua, botanas, lácteos, pan y limpieza; cada línea abarata 15 % su categoría y sube la lealtad.
- Las partidas del Hito 1 se actualizan solas.

## Arte, IA de mercado y fondo
- **Arte generado** en `src/assets/`: mapa ilustrado de la CDMX con máscara de colonias (8 colonias clicables), fachadas de los 5 formatos (día y cerrada), edificios de relleno (día y noche), cliente caminando de 6 fotogramas en 4 direcciones recoloreado en 6 variantes, cajero de 4 fotogramas, repartidor, camioneta, camión de CEDIS, motos, íconos y asesores. Si una imagen no carga, el juego usa su dibujo de respaldo.
- **IA de mercado** (`engine/market.ts`): cada partida genera colonias con tráfico, poder adquisitivo y tendencia distintos, y tres cadenas rivales con estrategia propia (guerra de precios, expansión rápida, premium). Cada lunes deciden dónde abrir o a quién atacar según dónde ganas tú; hay eventos de mercado por colonia.
- **Analista de mercado** (`engine/analyst.ts`): recomienda la mejor apertura, sugiere ajustes de margen prudentes (máximo 8 puntos) que se aplican con un toque, y avisa de filas, desabasto, guerras de precios y colonias en crecimiento.
- **Fondo de inversión**: bonos, fondo balanceado y acciones mexicanas, con comisión de entrada/salida y rallies o correcciones de la bolsa.
- La interfaz ya no se redibuja mientras tocas la pantalla y la página no rebota.

## Siguientes hitos
- **Hito 3**: mapa nacional, conglomerados con IA (nombres ficticios), BMV, alianzas, guerras de precios, M&A y calendario mexicano completo.
- **Hito 4**: holding del futuro, bienes raíces, tutorial de 60 s y balance fino.

`prototipo/` conserva la versión anterior en HTML/JS como referencia de arte y mecánicas.
