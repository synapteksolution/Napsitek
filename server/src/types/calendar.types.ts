export interface BookingRequest {
  nombre: string
  telefono: string
  email: string
  date: string // YYYY-MM-DD
  time: string // HH:mm (e.g. "10:00")
  timeZone?: string // e.g. "America/Bogota"
}

export interface TimeSlot {
  time: string // "09:00"
  available: boolean
}

export interface AvailabilityResponse {
  date: string
  slots: TimeSlot[]
}

export interface BookingResponse {
  success: boolean
  message: string
  eventId?: string
  htmlLink?: string
}
