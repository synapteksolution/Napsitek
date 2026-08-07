import express from 'express'
import cors from 'cors'
import { config, validateEnv } from './config/env.js'
import calendarRoutes from './routes/calendar.routes.js'

const app = express()

// Middlewares
app.use(cors({ origin: config.frontendUrl }))
app.use(express.json())

// Rutas
app.use('/api', calendarRoutes)

// Health check endpoint
app.get('/health', (_req, res) => {
  const { valid } = validateEnv()
  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    googleCalendarConfigured: valid,
  })
})

app.listen(config.port, () => {
  console.log(`[napsitek-backend] Servidor escuchando en http://localhost:${config.port}`)
  const { valid, missing } = validateEnv()
  if (!valid) {
    console.warn(`[napsitek-backend] ATENCIÓN: Faltan credenciales de GCP: ${missing.join(', ')}`)
  } else {
    console.log('[napsitek-backend] Credenciales de Google Calendar cargadas correctamente.')
  }
})
