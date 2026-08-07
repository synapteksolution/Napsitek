import { google } from 'googleapis'
import { config, validateEnv } from '../config/env.js'
import { BookingRequest, TimeSlot, BookingResponse } from '../types/calendar.types.js'

const DEFAULT_BUSINESS_SLOTS = [
  '09:00', '10:00', '11:00', '13:00', '14:30', '16:00', '17:00'
]

// Colombia (America/Bogota) es UTC-05:00 de forma constante (sin horario de verano)
const COLOMBIA_OFFSET = '-05:00'

/**
 * Convierte una fecha y hora local de Colombia a un objeto Date absoluto
 */
function parseColombiaDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00${COLOMBIA_OFFSET}`)
}

export class CalendarService {
  private getAuthClient() {
    const { valid, missing } = validateEnv()
    if (!valid) {
      throw new Error(`Faltan variables de entorno para Google Calendar: ${missing.join(', ')}`)
    }

    return new google.auth.JWT({
      email: config.google.clientEmail,
      key: config.google.privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
  }

  /**
   * Obtiene la disponibilidad filtrando horas pasadas en horario Colombia y eventos de Google Calendar
   */
  async getAvailability(dateStr: string): Promise<TimeSlot[]> {
    const now = Date.now()
    const { valid } = validateEnv()

    // Si aún no se han configurado las credenciales de GCP, filtra sólo las horas pasadas
    if (!valid) {
      console.warn('[CalendarService] Credenciales de GCP no detectadas. Devolviendo horario por defecto filtrando pasados.')
      return DEFAULT_BUSINESS_SLOTS.map((time) => {
        const slotStart = parseColombiaDate(dateStr, time)
        return {
          time,
          available: slotStart.getTime() > now,
        }
      })
    }

    try {
      const auth = this.getAuthClient()
      const calendar = google.calendar({ version: 'v3', auth })

      // Rango del día en horario Colombia (-05:00)
      const timeMin = new Date(`${dateStr}T00:00:00${COLOMBIA_OFFSET}`).toISOString()
      const timeMax = new Date(`${dateStr}T23:59:59${COLOMBIA_OFFSET}`).toISOString()

      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          timeZone: config.google.timeZone,
          items: [{ id: config.google.calendarId }],
        },
      })

      const busySlots = response.data.calendars?.[config.google.calendarId]?.busy || []

      return DEFAULT_BUSINESS_SLOTS.map((slotTime) => {
        const slotStart = parseColombiaDate(dateStr, slotTime)
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000) // 30 min

        // 1. Validar que la hora no haya pasado en Colombia
        if (slotStart.getTime() <= now) {
          return { time: slotTime, available: false }
        }

        // 2. Validar colisión con eventos en Google Calendar
        const isBusy = busySlots.some((busy) => {
          if (!busy.start || !busy.end) return false
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return slotStart < busyEnd && slotEnd > busyStart
        })

        return {
          time: slotTime,
          available: !isBusy,
        }
      })
    } catch (error) {
      console.error('[CalendarService] Error al consultar disponibilidad en Google Calendar:', error)
      throw error
    }
  }

  /**
   * Agenda una nueva cita en el calendario de Google validando que la fecha/hora sea futura
   */
  async createBooking(booking: BookingRequest): Promise<BookingResponse> {
    const { valid, missing } = validateEnv()

    if (!valid) {
      return {
        success: false,
        message: `Servidor no configurado con credenciales de GCP. Faltan: ${missing.join(', ')}`,
      }
    }

    const startDateTime = parseColombiaDate(booking.date, booking.time)
    if (startDateTime.getTime() <= Date.now()) {
      return {
        success: false,
        message: 'No es posible agendar citas en fechas u horarios pasados.',
      }
    }

    try {
      const auth = this.getAuthClient()
      const calendar = google.calendar({ version: 'v3', auth })

      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000) // 30 mins

      const eventRequestBody = {
        summary: `Diagnóstico Napsi Tek - ${booking.nombre}`,
        description: `Cita solicitada desde el sitio web.\n\nNombre: ${booking.nombre}\nTeléfono/WhatsApp: ${booking.telefono}\nCorreo: ${booking.email}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: config.google.timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: config.google.timeZone,
        },
        attendees: [{ email: booking.email }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      }

      let res
      try {
        res = await calendar.events.insert({
          calendarId: config.google.calendarId,
          requestBody: eventRequestBody,
        })
      } catch (firstAttemptError: any) {
        console.warn('[CalendarService] Intento 1 falló. Reintentando sin lista de attendees...', firstAttemptError?.message)
        delete (eventRequestBody as any).attendees
        res = await calendar.events.insert({
          calendarId: config.google.calendarId,
          requestBody: eventRequestBody,
        })
      }

      return {
        success: true,
        message: 'Cita agendada exitosamente en Google Calendar.',
        eventId: res.data.id || undefined,
        htmlLink: res.data.htmlLink || undefined,
      }
    } catch (error: any) {
      const details = error?.response?.data?.error?.message || error?.message || String(error)
      console.error('[CalendarService] Error al agendar en Google Calendar:', details)
      
      return {
        success: false,
        message: `Error de Google Calendar API: ${details}`,
      }
    }
  }
}
