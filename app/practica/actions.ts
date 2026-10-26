'use server'

import { COOKIE, cookieOptions, isVariant, parseLog, serializeLog, THIRTY_DAYS } from "@/lib/experiment"
import { cookies } from "next/headers"

export async function recordConversion(): Promise<{ status: 'success' | 'already_converted' | 'error' }> {
  const cookieStore = await cookies()

  const variant = cookieStore.get(COOKIE.variant)?.value;
  const hasConverted = cookieStore.get(COOKIE.converted)?.value
  const rawLog = cookieStore.get(COOKIE.log)?.value

  // Validar que no haya convertido antes (una conversión por visitante)
  if (hasConverted) {
    return { status: 'already_converted' }
  }

  // Validar que tenga una variante asignada válida
  if (!isVariant(variant)) {
    return { status: 'error' }
  }

  // Procesar el log validándolo previamente
  const log = parseLog(rawLog)

  // Sumar la conversión a la variante correspondiente
  log[variant].conversions += 1

  // Determinar seguridad de la cookie según el entorno
  const isSecure = process.env.NODE_ENV === 'production'

  // Persistir los cambios en las cookies
  // Guarda el log actualizado y marca al visitante como convertido por 30 días.
  cookieStore.set(COOKIE.log, serializeLog(log), cookieOptions(isSecure, THIRTY_DAYS))
  cookieStore.set(COOKIE.converted, '1', cookieOptions(isSecure, THIRTY_DAYS))

  return { status: 'success' }
}