import { google } from 'googleapis'
import { config, validateEnv } from '../config/env.js'
import { BookingRequest, TimeSlot, BookingResponse } from '../types/calendar.types.js'

// Franjas de horarios laborales configurables (e.g. de 09:00 a 17:00 cada hora)
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

    // Si aún no se han configurado las credenciales de GCP, retorna franjas predeterminadas (modo desarrollo)
    if (!valid) {
      console.warn('[CalendarService] Credenciales de Google GCP no detectadas. Devolviendo horario por defecto.')
      return DEFAULT_BUSINESS_SLOTS.map((time) => ({ time, available: true }))
    }

    try {
      const auth = this.getAuthClient()
      const calendar = google.calendar({ version: 'v3', auth })

      // Definir inicio y fin del día en la zona horaria especificada
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

      // Evaluar cada hora por defecto si colisiona con algún intervalo busy
      return DEFAULT_BUSINESS_SLOTS.map((slotTime) => {
        const slotStart = new Date(`${dateStr}T${slotTime}:00`)
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000) // Duración 30 minutos

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
   * Agende una nueva cita en el calendario de Google
   */
  async createBooking(booking: BookingRequest): Promise<BookingResponse> {
    const { valid } = validateEnv()

    if (!valid) {
      return {
        success: false,
        message: 'El servidor aún no está configurado con las credenciales de Google Calendar.',
      }
    }

    try {
      const auth = this.getAuthClient()
      const calendar = google.calendar({ version: 'v3', auth })

      const startDateTime = new Date(`${booking.date}T${booking.time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000) // 30 mins

      const event = {
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
        attendees: [{ email: booking.email }, { email: config.google.calendarId }],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      }

      const res = await calendar.events.insert({
        calendarId: config.google.calendarId,
        requestBody: event,
        sendUpdates: 'all', // Envia invitación de email al cliente y al organizador
      })

      return {
        success: true,
        message: 'Cita agendada exitosamente en Google Calendar.',
        eventId: res.data.id || undefined,
        htmlLink: res.data.htmlLink || undefined,
      }
    } catch (error) {
      console.error('[CalendarService] Error al agendar evento en Google Calendar:', error)
      return {
        success: false,
        message: 'Hubo un problema al agendar la cita. Por favor intenta nuevamente o contáctanos por WhatsApp.',
      }
    }
  }
}
