import type { Metadata } from 'next'
import Link from 'next/link'
import {
  HASH_EXAMPLE_ID,
  TEST_CASE,
  VARIANTS,
  assignVariant,
  conversionRate,
  formatCount,
  formatPoints,
  formatRate,
  rateGap,
  type Variant,
} from '@/lib/experiment'

export const metadata: Metadata = {
  title: 'Bitácora',
  robots: { index: false, follow: false },
}

const ROWS: Variant[] = ['a', 'b']

export default function BitacoraPage() {
  // Evaluar la variante asignada al ID
  const testAssignedVariant = assignVariant(HASH_EXAMPLE_ID);

  return (
    <main id="contenido" className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-10 md:py-14">
      <p className="font-mono text-[0.7rem] tracking-[0.16em] text-muted-foreground uppercase">
        Con eventos validados
      </p>
      <h1 className="max-w-2xl font-serif text-4xl tracking-tight text-balance md:text-5xl">
        La bitácora ahora calcula la tasa.
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Los porcentajes se derivan de la fórmula matemática (conversiones / impresiones) del caso fijo provisto por la cátedra.
      </p>
      <table className="w-full text-left text-sm">
        <caption className="mb-3 text-left text-muted-foreground">
          Cohorte fija. El cálculo automático da A con 7,50%, B con 13,14% y la diferencia de 5,64 pp.
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 font-medium">Variante</th>
            <th className="py-2 font-medium">Impresiones</th>
            <th className="py-2 font-medium">Conversiones</th>
            <th className="py-2 font-medium">Tasa</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((variant) => (
            <tr key={variant} className="border-b border-border">
              <td className="py-3">
                {variant.toUpperCase()} · {VARIANTS[variant].name}
              </td>
              <td className="py-3 font-mono">{formatCount(TEST_CASE[variant].impressions)}</td>
              <td className="py-3 font-mono">{formatCount(TEST_CASE[variant].conversions)}</td>
              <td className="py-3 font-mono">{formatRate(conversionRate(TEST_CASE[variant]))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-mono text-sm">B − A = {formatPoints(rateGap(TEST_CASE))}</p>
      <p className="font-mono text-sm">
        {/* Mostrar dinámicamente el resultado del hash para el caso fijo */}
        assignVariant('{HASH_EXAMPLE_ID}') → {testAssignedVariant}
      </p>
      <Link href="/practica" className="text-sm text-muted-foreground underline">
        Volver a la landing
      </Link>
    </main>
  )
}
