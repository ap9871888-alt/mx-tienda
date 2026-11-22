# ☕ Café MX Inc.

Simulador de negocios: empieza con un kiosco en la Ciudad de México y construye un imperio del café, del grano a la bolsa.

## Jugar
```bash
cd cafe-mx
npm start        # o cualquier servidor estático → http://localhost:8080
npm test         # pruebas del motor de simulación
```
No necesita compilación ni dependencias. Es una PWA: se puede instalar en el teléfono y funciona sin conexión después de la primera visita. La partida se guarda sola en el navegador (y se puede copiar/pegar como texto).

## Qué hay en el juego
- **Mapa de expansión**: 6 ciudades (CDMX, Oaxaca, Mérida, Guadalajara, Monterrey, Cancún/Tulum) con barrios, renta, tráfico y poder adquisitivo distintos.
- **4 niveles de tienda**: Kiosco de Barrio → Café Artesanal Oaxaca → Barra Moderna Polanco → Hacienda Flagship y Tostador.
- **Menú y precios** por tienda (Café de Olla, Latte de Horchata, Mocha Mexicano, Pan de Muerto de temporada…). La demanda responde al precio, la calidad del grano, los baristas y el ambiente.
- **Personal**: contrata, capacita (1–5 ★) y despide baristas; la capacidad limita cuántos clientes atiendes.
- **Abasto de grano**: Veracruz, Chiapas, Oaxaca o importado; autocompra; fincas propias que producen grano diario; tostador propio con la Hacienda.
- **Finanzas**: estado de resultados mensual, gráfica de ventas y utilidad, crédito bancario y quiebra tras 45 días en rojo.
- **Inversiones**: bolsa con empresas ficticias, bienes raíces con renta mensual, startups de capital de riesgo.
- **Calendario mexicano**: quincenas, Día de Muertos, Buen Fin, posadas, Guelaguetza, temporada alta en el Caribe, y eventos aleatorios (heladas, olas de calor, reseñas virales, inflación).
- **Fases de expansión I–V**, prestigio de marca y distintivo de Café Sostenible.

## Arquitectura
- `js/data.js`: contenido (ciudades, productos, niveles, orígenes, inversiones).
- `js/engine.js`: simulación pura sin DOM; determinista con semilla. Probada en `tests/`.
- `js/ui.js`: interfaz móvil (vistas como HTML, eventos delegados).
- `assets/`: arte recortado de la guía de estilo del proyecto.

## Camino a publicar
1. **Web / itch.io**: sube la carpeta `cafe-mx/` tal cual (es estática).
2. **Android y iOS**: envuelve la carpeta con [Capacitor](https://capacitorjs.com) (`npx cap init`, `webDir: "cafe-mx"`), y publica en Google Play y App Store.
3. **PC (Steam)**: empaqueta con Tauri o Electron.
4. Pendientes sugeridos antes de lanzar: música y efectos, tutorial guiado, más ciudades (Puebla, Querétaro, CDMX sur), logros de plataforma, nube para guardar partidas, monetización (versión premium o expansión sin anuncios) y pruebas de balance con jugadores.
