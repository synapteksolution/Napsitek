import { Router } from 'express'
import { CalendarController } from '../controllers/calendar.controller.js'

const router = Router()
const calendarController = new CalendarController()

router.get('/availability', (req, res) => calendarController.getAvailability(req, res))
router.post('/bookings', (req, res) => calendarController.createBooking(req, res))

export default router
