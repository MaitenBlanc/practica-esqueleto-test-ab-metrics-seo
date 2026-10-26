import fs from 'node:fs'
import path from 'node:path'

export type Variant = 'a' | 'b'

export type VariantStats = {
  impressions: number
  conversions: number
}

export type ExperimentLog = Record<Variant, VariantStats>

export const COOKIE = {
  visitor: 'lab_visitor',
  variant: 'lab_variant',
  log: 'lab_log',
  impressed: 'lab_impressed',
  converted: 'lab_converted',
} as const

export const THIRTY_DAYS = 60 * 60 * 24 * 30
export const SESSION_WINDOW = 60 * 30
export const CANONICAL_PATH = '/practica'
export const TITLE_RANGE = { min: 50, max: 60 }
export const DESCRIPTION_RANGE = { min: 140, max: 160 }

export const OFFER = [
  { label: 'Inicio', value: '14 de abril' },
  { label: 'Duración', value: '8 semanas' },
  { label: 'Cupo', value: '12 personas' },
  { label: 'Oficios', value: 'Carpintería, electricidad, cocina' },
] as const

export const VARIANTS = {
  a: {
    id: 'a',
    name: 'Control',
    seoTitle: 'Cursos de oficio en ocho semanas, con salida laboral',
    seoDescription:
      'Aprendé carpintería, electricidad o cocina en ocho semanas. Grupos de doce personas y práctica real, con una salida laboral que se puede cobrar.',
    headline: 'Ocho semanas para un oficio que se puede cobrar.',
    emphasis: null,
    lede: 'La práctica empieza en la primera clase. El mensaje de esta variante habla del método, no de la escasez.',
    cta: 'Ver cupos de abril',
  },
  b: {
    id: 'b',
    name: 'Tratamiento',
    seoTitle: 'Abril abre cupos: cursos de oficio en grupos de 12',
    seoDescription:
      'El 14 de abril empiezan grupos de doce. En la cohorte anterior, ocho de cada diez consiguieron trabajo en el rubro antes de los noventa días.',
    headline: 'El curso empieza el 14 de abril.',
    emphasis: 'El cupo, no.',
    lede: 'Doce lugares y una fecha. El mensaje de esta variante apura la decisión, sin cambiar la oferta.',
    cta: 'Reservar mi lugar',
  },
} as const

export const TEST_CASE: ExperimentLog = {
  a: { impressions: 240, conversions: 18 },
  b: { impressions: 236, conversions: 31 },
}

export const HASH_EXAMPLE_ID = 'lab-visitor-demo-01'

export function isVariant(value: string | null | undefined): value is Variant {
  return value === 'a' || value === 'b'
}

export function emptyLog(): ExperimentLog {
  return {
    a: { impressions: 0, conversions: 0 },
    b: { impressions: 0, conversions: 0 },
  }
}

export function assignVariant(_visitorId: string): Variant {
  // Convierte  el string del ID en un entero usando un algoritmo de hash estándar (DJB2/Java hashCode)
  let hash = 0;
  for (let i = 0; i < _visitorId.length; i++) {
    const char = _visitorId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Forzar a que sea un entero de 32 bits
  }
  
  // Usa el módulo 2 sobre el valor absoluto del hash
  // Si el resto es 0, asigna 'a' (Control). Si es 1, asigna 'b' (Tratamiento).
  return Math.abs(hash) % 2 === 0 ? 'a' : 'b';
}

export function conversionRate(_stats: VariantStats): number | null {
  // Sin impresiones, devolver null, no 0
  if (_stats.impressions <= 0) return null
  return _stats.conversions / _stats.impressions
}

export function rateGap(log: ExperimentLog): number | null {
  const control = conversionRate(log.a)
  const treatment = conversionRate(log.b)
  if (control === null || treatment === null) return null
  return (treatment - control) * 100
}

function isValidStats(value: unknown): value is VariantStats {
  if (!value || typeof value !== 'object') return false
  const stats = value as Record<string, unknown>
  return (
    typeof stats.impressions === 'number' &&
    Number.isFinite(stats.impressions) &&
    stats.impressions >= 0 &&
    typeof stats.conversions === 'number' &&
    Number.isFinite(stats.conversions) &&
    stats.conversions >= 0
  )
}

export function parseLog(_raw: string | undefined): ExperimentLog {
  if (!_raw) return emptyLog()
  try {
    const parsed = JSON.parse(_raw) as Record<string, unknown>
    // Validar que el JSON tenga la estructura y tipos numéricos correctos antes de usarlo
    if (isValidStats(parsed?.a) && isValidStats(parsed?.b)) {
      return {
        a: {
          impressions: Math.floor(parsed.a.impressions),
          conversions: Math.floor(parsed.a.conversions),
        },
        b: {
          impressions: Math.floor(parsed.b.impressions),
          conversions: Math.floor(parsed.b.conversions),
        },
      }
    }
  } catch {
    // Si el JSON está roto, devolver log vacío
  }
  return emptyLog()
}

export function serializeLog(log: ExperimentLog): string {
  return JSON.stringify(log)
}

const LOG_FILE_PATH = path.join(process.cwd(), '.next', 'experiment-log.json')

declare global {
  var __labExperimentLog: string | undefined
}

export function readStoredLog(cookieRaw?: string): ExperimentLog {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const fileContent = fs.readFileSync(LOG_FILE_PATH, 'utf-8')
      const parsed = parseLog(fileContent)
      globalThis.__labExperimentLog = serializeLog(parsed)
      return parsed
    }
  } catch {
    // Fallback a memoria o cookie si el sistema de archivos no está disponible
  }

  if (globalThis.__labExperimentLog) {
    return parseLog(globalThis.__labExperimentLog)
  }

  return parseLog(cookieRaw)
}

export function writeStoredLog(log: ExperimentLog): string {
  const validated = parseLog(serializeLog(log))
  const serialized = serializeLog(validated)
  globalThis.__labExperimentLog = serialized

  try {
    fs.mkdirSync(path.dirname(LOG_FILE_PATH), { recursive: true })
    fs.writeFileSync(LOG_FILE_PATH, serialized, 'utf-8')
  } catch {
    // Si el entorno es de solo lectura, se conserva en memoria y cookie
  }

  return serialized
}

const numberFormat = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const integerFormat = new Intl.NumberFormat('es-AR')

export function formatCount(value: number): string {
  return integerFormat.format(value)
}

export function formatRate(rate: number | null): string {
  if (rate === null) return 'Pendiente'
  return `${numberFormat.format(rate * 100)}%`
}

export function formatPoints(value: number | null): string {
  if (value === null) return 'Pendiente'
  return `${numberFormat.format(value)} pp`
}

export function characterCount(value: string): number {
  return Array.from(value).length
}

export function inRange(length: number, range: { min: number; max: number }): boolean {
  return length >= range.min && length <= range.max
}

export function cookieOptions(secure: boolean, maxAge?: number) {
  // El preview corre en un iframe: la cookie tiene que ser Secure y SameSite=None.
  return {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: secure ? ('none' as const) : ('lax' as const),
    partitioned: secure,
    ...(typeof maxAge === 'number' ? { maxAge } : {}),
  }
}
