import { request } from 'http'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { assignVariant, COOKIE, cookieOptions, isVariant, parseLog, serializeLog, SESSION_WINDOW, THIRTY_DAYS } from './lib/experiment';

export function proxy(_request: NextRequest) {
  const url = _request.nextUrl;
  const preview = url.searchParams.get('preview');

  // Separar el preview: si hay query ?preview=a|b, deja pasar el request 
  // sin leer, escribir ni pisar cookies
  if(isVariant(preview)) {
    return NextResponse.next();
  }

  let visitorId = _request.cookies.get(COOKIE.visitor)?.value;
  let variant = _request.cookies.get(COOKIE.variant)?.value;
  let isNewVisitor = false;

  // Asignación estable: Si no existe el visitante, lo crea y le asigna una variante
  if(!visitorId || !isVariant(variant)) {
    visitorId = crypto.randomUUID();
    variant = assignVariant(visitorId);
    isNewVisitor = true;
  }

  const response = NextResponse.next();

  // En Vercel/Next.js, verificar si está en HTTPS para la seguridad de la cookie
  const isSecure = url.protocol === 'hhtps:' || _request.headers.get('x-forwarded-proto') === 'https';

  // Persistir visitante y variante si son nuevos (duran 30 días)
  if(isNewVisitor) {
    response.cookies.set(COOKIE.visitor, visitorId, cookieOptions(isSecure, THIRTY_DAYS));
    response.cookies.set(COOKIE.variant, variant, cookieOptions(isSecure, THIRTY_DAYS));
  }

  // Anotar impresión: Solo una por sesión de 30 min
  const hasImpressed = _request.cookies.get(COOKIE.impressed)?.value;

  if(!hasImpressed) {
    // Lee el log actual desde la cookie (validado por parseLog)
    const rawLog = _request.cookies.get(COOKIE.log)?.value;
    const log = parseLog(rawLog);

    // Sumar la impresión a la variante asignada
    log[variant].impressions += 1;

  // Guardamos el log y bloqueamos nuevas impresiones por 30 minutos[cite: 4]
    response.cookies.set(COOKIE.log, serializeLog(log), cookieOptions(isSecure, THIRTY_DAYS))
    response.cookies.set(COOKIE.impressed, '1', cookieOptions(isSecure, SESSION_WINDOW))
  }

  return response
}

export const config = {
  matcher: ['/practica'],
}
