# 🎬 Audio Studio

Sube un video, extrae el audio (MP3 o WAV), descárgalo, transcríbelo y genera un guion.

**100% gratis y sin llaves.** Todo corre en el navegador: el video no sale de tu computadora. Los modelos son abiertos y se descargan una vez.

## Uso local
```bash
npm install
npm run dev   # http://localhost:5173
```

## Pruebas
```bash
npm test             # lógica de formato: fragmentos de texto, ventanas, WAV, subtítulos SRT/VTT
npm run check:ffmpeg # verifica en Node que el núcleo de ffmpeg extrae MP3, WAV y audio de 16 kHz
```
`check:ffmpeg` usa `@ffmpeg/core` (solo para desarrollo) y genera su propio tono, así que no necesita videos.

## Arquitectura
- `src/workers/ai.worker.js`: Whisper (transcripción) y Kokoro (voz) corren en un Web Worker, así la página no se congela.
- `src/lib/worker.js`: cliente del worker (trabajos, progreso y cancelación).
- `src/lib/script.js`: WebLLM para los guiones (hilo principal).
- `src/lib/audioFormat.js`: funciones puras de formato, con pruebas.

## Requisitos del navegador
- Extraer audio y transcribir: cualquier navegador moderno.
- Generar guion: **WebGPU**, es decir Chrome o Edge de escritorio. Si no está disponible, pega tu transcripción.

## Descargas por primera vez
- Conversor ffmpeg: ~30 MB
- Transcripción (Whisper base): ~80 MB
- Modelo de guion (Qwen2.5 1.5B): ~1 GB

Se guardan en caché del navegador, así que la siguiente vez son inmediatas.

## Límites
- Videos largos tardan mucho en transcribirse, porque corren en la computadora de quien los usa.
- El modelo de guion es pequeño: para transcripciones muy largas usa solo la primera parte (~9000 caracteres).

## Despliegue
Sitio estático: Vercel lo despliega automáticamente con cada push a `main` (build: `npm run build`, salida: `dist`).

## Lote de videos
En la sección **Lote: varios videos** elige varios archivos. Se procesan uno por uno: cada uno queda con su audio, su transcripción y sus subtítulos. Si uno falla, los demás siguen. **Usar para el guion** pasa la transcripción de ese video al guion.

## Tiempos por palabra
Marca **Tiempos por palabra** antes de transcribir. Descarga **Tiempos JSON** para tener cada palabra con su inicio y fin. Con esa opción, los subtítulos SRT/VTT salen por palabra.

## Sin conexión (PWA)
La app se puede instalar desde el navegador (menú "Instalar aplicación"). Después de la primera visita, la página abre sin conexión. Los modelos de IA ya descargados también quedan guardados en el navegador. El service worker solo funciona en la versión de producción, no en `npm run dev`.

## Lista de pruebas manuales
Con un video de 1–2 minutos:
1. Elige el video y extrae el audio en MP3. Debe aparecer el reproductor y el botón de descarga.
2. Transcribe con el modelo **tiny** y revisa el tiempo. Los subtítulos SRT y VTT deben descargarse.
3. Edita el texto y confirma el aviso de que los subtítulos usan la transcripción original.
4. Genera un guion en Chrome de escritorio. En Safari o celular debe aparecer el aviso de WebGPU.
5. Usa **Usar guion**, elige la voz Dora y genera el audio. Descarga MP3 y WAV.
6. Pulsa **Cancelar** durante una transcripción: no debe aparecer ningún error.
7. Recarga la página: la transcripción y el guion deben seguir ahí.
9. Marca **Tiempos por palabra**, transcribe y descarga **Tiempos JSON**.
8. Elige dos videos en **Lote**: los dos deben terminar en Listo, o el segundo en Error sin detener al primero.

Plan de trabajo completo: https://claude.ai/artifact/YSE3aoN92Fyp3WVZVE3Ucq
