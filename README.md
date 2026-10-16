# 🎬 Audio Studio

Sube un video, extrae el audio (MP3 o WAV), descárgalo, transcríbelo y genera un guion.

**100% gratis y sin llaves.** Todo corre en el navegador: el video no sale de tu computadora. Los modelos son abiertos y se descargan una vez.

## Uso local
```bash
npm install
npm run dev   # http://localhost:5173
```

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
