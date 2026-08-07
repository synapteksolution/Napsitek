import { google } from 'googleapis'
import { config, validateEnv } from '../config/env.js'
import { BookingRequest, TimeSlot, BookingResponse } from '../types/calendar.types.js'

const DEFAULT_BUSINESS_SLOTS = [
  '09:00', '10:00', '11:00', '13:00', '14:30', '16:00', '17:00'
]

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
   * Obtiene la disponibilidad filtrando los eventos ocupados de Google Calendar
   */
  async getAvailability(dateStr: string): Promise<TimeSlot[]> {
    const { valid } = validateEnv()

    if (!valid) {
      console.warn('[CalendarService] Credenciales de Google GCP no detectadas. Devolviendo horario por defecto.')
      return DEFAULT_BUSINESS_SLOTS.map((time) => ({ time, available: true }))
    }

    try {
      const auth = this.getAuthClient()
      const calendar = google.calendar({ version: 'v3', auth })

      const timeMin = new Date(`${dateStr}T00:00:00`).toISOString()
      const timeMax = new Date(`${dateStr}T23:59:59`).toISOString()

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
        const slotStart = new Date(`${dateStr}T${slotTime}:00`)
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

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
   * Agenda una nueva cita en el calendario de Google de forma resiliente
   */
  async createBooking(booking: BookingRequest): Promise<BookingResponse> {
    const { valid, missing } = validateEnv()

    if (!valid) {
      return {
        success: false,
        message: `Servidor no configurado con credenciales de GCP. Faltan: ${missing.join(', ')}`,
      }
    }

    try {
      const auth = this.getAuthClient()
      const calendar = google.calendar({ version: 'v3', auth })

      const startDateTime = new Date(`${booking.date}T${booking.time}:00`)
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
        // Intento 1: Crear evento con invitación al correo del cliente
        res = await calendar.events.insert({
          calendarId: config.google.calendarId,
          requestBody: eventRequestBody,
        })
      } catch (firstAttemptError: any) {
        console.warn('[CalendarService] Intento 1 falló (posible restricción de invitaciones de Service Account). Reintentando sin lista de attendees...', firstAttemptError?.message)
        
        // Intento 2: Crear evento directamente en el calendario sin forzar la lista de invitados
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
      console.error('[CalendarService] Error definitivo al agendar en Google Calendar:', details)
      
      return {
        success: false,
        message: `Error de Google Calendar API: ${details}`,
      }
    }
  }
}
