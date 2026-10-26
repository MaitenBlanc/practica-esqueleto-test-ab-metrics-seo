import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  assignVariant,
  COOKIE,
  cookieOptions,
  isVariant,
  readStoredLog,
  SESSION_WINDOW,
  THIRTY_DAYS,
  type Variant,
  writeStoredLog,
} from './lib/experiment'

export function proxy(_request: NextRequest) {
  const url = _request.nextUrl
  const preview = url.searchParams.get('preview')

  // Separar el preview: si hay query ?preview=a|b, deja pasar el request
  // sin leer, escribir ni pisar cookies ni sumar impresiones
  if (isVariant(preview)) {
    return NextResponse.next()
  }

  const existingVisitor = _request.cookies.get(COOKIE.visitor)?.value
  const existingVariant = _request.cookies.get(COOKIE.variant)?.value
  const isNewVisitor = !existingVisitor || !isVariant(existingVariant)

  const visitorId: string = isNewVisitor ? crypto.randomUUID() : existingVisitor
  const variant: Variant = isNewVisitor ? assignVariant(visitorId) : existingVariant

  // Asignación estable: Si no existe el visitante, propagar las cookies al request actual
  // para que el primer render en el servidor y generateMetadata lean la misma variante asignada
  if (isNewVisitor) {
    _request.cookies.set(COOKIE.visitor, visitorId)
    _request.cookies.set(COOKIE.variant, variant)
  }

  const response = NextResponse.next({
    request: _request,
  })

  // En Vercel/Next.js, verificar si está en HTTPS para la seguridad de la cookie
  const isSecure = url.protocol === 'https:' || _request.headers.get('x-forwarded-proto') === 'https'

  // Persistir visitante y variante si son nuevos (duran 30 días)
  if (isNewVisitor) {
    response.cookies.set(COOKIE.visitor, visitorId, cookieOptions(isSecure, THIRTY_DAYS))
    response.cookies.set(COOKIE.variant, variant, cookieOptions(isSecure, THIRTY_DAYS))
  }

  // Anotar impresión: Solo una por sesión de 30 min
  const hasImpressed = _request.cookies.get(COOKIE.impressed)?.value

  if (!hasImpressed) {
    // Lee el log actual validado (desde persistencia del servidor o cookie)
    const rawLog = _request.cookies.get(COOKIE.log)?.value
    const log = readStoredLog(rawLog)

    // Sumar la impresión a la variante asignada
    log[variant].impressions += 1

    // Guardamos el log y bloqueamos nuevas impresiones por 30 minutos
    const serialized = writeStoredLog(log)
    response.cookies.set(COOKIE.log, serialized, cookieOptions(isSecure, THIRTY_DAYS))
    response.cookies.set(COOKIE.impressed, '1', cookieOptions(isSecure, SESSION_WINDOW))
  }

  return response
}

export const config = {
  matcher: ['/practica'],
}
