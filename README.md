<div align="center">

# 🌸 MaiBot

**Anime, osu! y utilidades para tu servidor de Discord.**

<p>
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white" alt="discord.js">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/licencia-ISC-22c55e" alt="Licencia ISC">
</p>

</div>

---

**MaiBot** es un bot modular de Discord pensado para un servidor propio. Anuncia episodios de anime de forma automática, muestra el calendario diario, permite buscar animes y beatmaps de osu!, procesa archivos `.osr` y convierte emojis personalizados en imágenes.

Está construido con **discord.js v14**, una arquitectura por *features* y servicios independientes, para que cada módulo viva por separado y sea fácil de mantener.

## ✨ Características

| | Módulo | Qué hace |
| :-: | --- | --- |
| 🌸 | **Anuncios de anime** | Publica automáticamente los episodios del día a las **9:00** y **14:00** (`America/Managua`). Evita duplicados por servidor y por día. |
| 🗓️ | **Calendario** | Muestra un embed por episodio programado para hoy, con hora local, episodio, categoría, portada y enlace a Itadakimasu. |
| 🔎 | **Buscador de anime** | `/search` con carrusel de resultados, botones *Anterior / Siguiente / Ver info*, sinopsis y datos detallados. |
| 🎵 | **osu! beatmaps** | `/btm` busca mapas en modo osu!standard, muestra dificultades y adjunta la **preview en MP3**. |
| 🎮 | **Replays de osu!** | Detecta `.osr` en el canal configurado, genera el **gráfico de vida (HP)**, muestra el resumen del score y un embed del mapa jugado con estadísticas y preview. |
| 🖼️ | **Emoji → imagen** | Si alguien envía solo un emoji personalizado, lo reenvía como archivo y borra el mensaje original. |

## 🎮 Comandos

| Comando | Descripción | Opciones |
| --- | --- | --- |
| `/hi` | Saludo de prueba. | — |
| `/info` | Información del bot: ping, uptime, servidores y versiones. | — |
| `/calendario` | Calendario de anime del día o configuración de anuncios. | `accion` (`ver`, `estado`, `activar`, `desactivar`, `canal`), `canal` |
| `/anuncios` | Previsualiza o envía los episodios de hoy. | `modo` (`preview`, `enviar`), `forzar` |
| `/search` | Busca un anime y navega por los resultados. | `nombre` **(req)**, `pagina` |
| `/btm` | Busca un beatmap de osu! por nombre. | `nombre` **(req)**, `pagina` |

> Los anuncios automáticos se activan con `/calendario activar`. Solo administradores pueden enviar anuncios o cambiar la configuración.

## ⚙️ Requisitos

- **Node.js 18+** (recomendado 20 LTS)
- Un bot de Discord con el intent **Message Content** habilitado en el Developer Portal.
- Credenciales de la API de osu! (para `/btm` y los embeds de replays).
- Credenciales de la API de anime (para anuncios, calendario y `/search`).

**Permisos recomendados en el servidor:** *Enviar mensajes*, *Insertar enlaces*, *Adjuntar archivos* y *Gestionar mensajes* (este último para borrar el emoji original).

## 🚀 Instalación

```bash
# 1. Clona el repositorio
git clone <url-del-repositorio>
cd MaiBot

# 2. Instala dependencias
npm install

# 3. Crea tu archivo de entorno
Copy-Item .env.example .env   # PowerShell
# cp .env.example .env        # bash

# 4. Completa las variables en .env
# 5. Registra los comandos slash en tu servidor
npm run deploy

# 6. Inicia el bot
npm start
```

## 🔐 Variables de entorno

| Variable | Requerida | Descripción | Valor por defecto |
| --- | :-: | --- | --- |
| `DISCORD_TOKEN` | ✅ | Token del bot de Discord. | — |
| `GUILD_ID` | ✅¹ | ID del servidor donde se registran los comandos. | — |
| `OSU_REPLAY_CHANNEL_ID` | ❌ | Canal donde se escuchan los archivos `.osr`. | — |
| `OSU_CLIENT_ID` | ❌² | Client ID de la API de osu!. | — |
| `OSU_CLIENT_SECRET` | ❌² | Client Secret de la API de osu!. | — |
| `URL_BASE` | ❌³ | URL base de la API de anime. | — |
| `API_KEY` | ❌³ | API key de la API de anime. | — |
| `ANIME_TIMEZONE` | ❌ | Zona horaria de los anuncios. | `America/Managua` |
| `ANIME_SCHEDULE` | ❌ | Expresión cron de los anuncios. | `0 9,14 * * *` |
| `ITADAKIMASU_BASE_URL` | ❌ | Base para generar los enlaces de Itadakimasu. | `https://itadakimasu.online` |

¹ Necesaria para `npm run deploy`.
² Sin credenciales, `/btm` y el embed del mapa en replays no funcionan.
³ Sin `URL_BASE` y `API_KEY`, los anuncios automáticos quedan desactivados.

> El archivo `.env` **no** se versiona. `data/` también está en `.gitignore`.

## 🧩 Estructura del proyecto

```text
MaiBot/
├─ app.js                  # Punto de entrada
├─ src/
│  ├─ bot.js               # Cliente de Discord e intents
│  ├─ config.js            # Carga y valida variables de entorno
│  ├─ core/
│  │  ├─ commands.js       # Carga y enrutado de comandos
│  │  ├─ deploy.js         # Registro de comandos slash
│  │  └─ events.js         # Carga de eventos
│  └─ features/
│     ├─ anime-episodes/   # Anuncios, búsqueda y scheduler
│     ├─ calendar/         # Comando /calendario
│     ├─ general/          # /hi, /info y emoji → imagen
│     └─ osu/              # /btm, replays, gráficos y previews
├─ .env.example
└─ package.json
```

Cada *feature* contiene sus propios `commands/`, `events/` y `services/`. Los cargadores de `src/core/` escanean automáticamente estas carpetas: no hay que registrar nada a mano.

## 🛠️ Scripts

| Script | Acción |
| --- | --- |
| `npm start` | Inicia el bot. |
| `npm run dev` | Inicia con recarga automática (`node --watch`). |
| `npm run deploy` | Registra los comandos slash en el guild configurado. |

## 📌 Notas

- **Zona horaria:** los anuncios usan `America/Managua` (UTC-6) por defecto; el cron corre a las **9:00** y **14:00**.
- **Sin duplicados:** los episodios enviados se guardan en `data/anime-sent.json`. Si borras `data/`, es posible que se repitan anuncios.
- **Replays sin datos de vida:** si un `.osr` no trae suficientes puntos de la barra de vida, se envía el resumen sin gráfico en lugar de fallar.
- **Emoji → imagen:** funciona en todos los canales; si el bot no puede borrar el original, igual reenvía la imagen.
- **Intents:** `Guilds`, `GuildMessages` y `MessageContent`.

<div align="center">

---

Hecho con cariño para un servidor propio. 🌸

</div>
