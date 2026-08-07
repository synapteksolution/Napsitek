export interface TimeSlot {
  time: string
  available: boolean
}

export interface BookingPayload {
  nombre: string
  telefono: string
  email: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
}

export interface BookingResponse {
  success: boolean
  message: string
  eventId?: string
  htmlLink?: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function fetchAvailability(dateStr: string): Promise<TimeSlot[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/availability?date=${dateStr}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data.slots || []
  } catch (error) {
    console.error('Error al obtener la disponibilidad:', error)
    return []
  }
}

export async function createBooking(payload: BookingPayload): Promise<BookingResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.message || 'Error al procesar la reserva',
      }
    }

    return data
  } catch (error) {
    console.error('Error al enviar la reserva:', error)
    return {
      success: false,
      message: 'No fue posible conectar con el servidor. Revisa tu conexión o intenta más tarde.',
    }
  }
}
