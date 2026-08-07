import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  google: {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    calendarId: process.env.GOOGLE_CALENDAR_ID || '',
    timeZone: process.env.TIMEZONE || 'America/Bogota',
  },
}

export function validateEnv(): { valid: boolean; missing: string[] } {
  const required = ['GOOGLE_CLIENT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CALENDAR_ID']
  const missing = required.filter((key) => !process.env[key])
  return { valid: missing.length === 0, missing }
}
