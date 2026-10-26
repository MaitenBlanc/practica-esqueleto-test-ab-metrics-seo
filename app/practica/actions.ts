'use server'

import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import {
  COOKIE,
  cookieOptions,
  isVariant,
  readStoredLog,
  THIRTY_DAYS,
  writeStoredLog,
} from '@/lib/experiment'

export async function recordConversion(): Promise<{ status: 'success' | 'already_converted' | 'error' }> {
  const cookieStore = await cookies()
  const headerStore = await headers()

  const variant = cookieStore.get(COOKIE.variant)?.value
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
  const log = readStoredLog(rawLog)

  // Sumar la conversión a la variante correspondiente
  log[variant].conversions += 1

  // Determinar seguridad de la cookie según el protocolo/entorno
  const isSecure =
    headerStore.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production'

  // Persistir los cambios en la base del servidor y en las cookies
  const serialized = writeStoredLog(log)
  cookieStore.set(COOKIE.log, serialized, cookieOptions(isSecure, THIRTY_DAYS))
  cookieStore.set(COOKIE.converted, '1', cookieOptions(isSecure, THIRTY_DAYS))

  revalidatePath('/bitacora')

  return { status: 'success' }
}