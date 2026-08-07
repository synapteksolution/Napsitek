import { Request, Response } from 'express'
import { CalendarService } from '../services/calendar.service.js'
import { BookingRequest } from '../types/calendar.types.js'

const calendarService = new CalendarService()

export class CalendarController {
  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const date = req.query.date as string
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'Formato de fecha inválido. Usar YYYY-MM-DD' })
        return
      }

      const slots = await calendarService.getAvailability(date)
      res.json({ date, slots })
    } catch (error) {
      console.error('[CalendarController] Error en getAvailability:', error)
      res.status(500).json({ error: 'Error al consultar disponibilidad' })
    }
  }

  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const { nombre, telefono, email, date, time }: BookingRequest = req.body

      if (!nombre || !telefono || !email || !date || !time) {
        res.status(400).json({ error: 'Todos los campos (nombre, telefono, email, date, time) son obligatorios' })
        return
      }

      const result = await calendarService.createBooking({ nombre, telefono, email, date, time })
      if (!result.success) {
        res.status(400).json(result)
        return
      }

      res.status(201).json(result)
    } catch (error) {
      console.error('[CalendarController] Error en createBooking:', error)
      res.status(500).json({ error: 'Error interno al procesar la reserva' })
    }
  }
}
