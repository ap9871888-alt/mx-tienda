# 🎬 Audio Studio

Sube un video → extrae el audio (MP3, WAV, M4A, AAC, OGG, Opus, FLAC) → descárgalo → transcríbelo → genera un guion.

## Requisitos
- Node.js 18+
- `ffmpeg` instalado en el sistema

## Uso
```bash
npm install
cp .env.example .env   # y completa las llaves
npm run server         # http://localhost:5001
npm run dev            # http://localhost:3001 (otra terminal)
```

- Transcripción: `OPENAI_API_KEY` (Whisper, límite 25 MB de audio comprimido ≈ 70 min).
- Guiones: `ANTHROPIC_API_KEY` (Claude).
- Sin llaves, la conversión y descarga funcionan igual.
- Los archivos temporales se borran tras 1 hora. `MAX_UPLOAD_MB` limita la subida (500 por defecto).

## Despliegue
- **Backend** (Render, Docker con ffmpeg): crea un Web Service desde este repo (usa `render.yaml`/`Dockerfile`) y define `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` y `CORS_ORIGIN` (la URL de Vercel). El plan gratis de Render tiene disco efímero y se duerme tras inactividad.
- **Frontend** (Vercel): importa el repo y define `VITE_API_URL` con la URL del backend de Render.
