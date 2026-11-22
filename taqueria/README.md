# 🌮 Taquería Tycoon

Juego de acción e inversión: arrancas con un puesto de banqueta afuera del Metro Tacubaya, $450 en la caja y un trompo que no para.

## Jugar
```bash
cd taqueria
npm start   # http://localhost:8081
npm test    # pruebas del motor
```
Sin compilación ni dependencias. Todo el sonido (efectos y la cumbia del "Sonidero") se sintetiza en el navegador, así que no hay archivos de audio que licenciar.

## Cómo se juega
- **🔥 Comal**: 🔪 rebana el trompo (tecla R), 🍍 cacha la piña al vuelo (+$4 al pastor) y 🌮 despacha (Espacio) al primero de la fila. Arma el salsero 🌶️🍋🧅 como lo pide cada cliente para ganar propina y reputación; si tarda mucho, se va.
- **⚡ Rush X2**: pagos dobles 20 s, se recarga en 90 s.
- **📦 Abasto**: tortillas, carne (su precio sube con eventos) y salsas.
- **🛵 Entregas**: pedidos grandes por app; El Brayan lleva uno a la vez y su moto se mejora.
- **🏦 Cuenta**: deposita para proteger tu dinero de los asaltos; terminal de cobro +25 % de propina.
- **🏆 Expansión**: Monterrey (arrachera, vampiros) y Guadalajara (birria, barbacoa). Las sedes donde no estás despachando generan dinero pasivo cada segundo, y la mitad sigue mientras cierras el juego (máx. 2 h).
- **🚨 Emergencias**: inspección, se acaba el gas, asalto, influencer, tormenta, baile sonidero… cada una con dos decisiones.

## Archivos
- `js/engine.js`: reglas puras y probadas (`tests/`).
- `js/audio.js`: efectos y música con WebAudio; gritos del sampler con la voz del sistema.
- `js/ui.js`, `styles.css`: interfaz móvil.
