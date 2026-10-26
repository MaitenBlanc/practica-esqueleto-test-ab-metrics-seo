'use client'

import { useState, useTransition } from 'react'
import { recordConversion } from '@/app/practica/actions'

type ConversionStatus = 'idle' | 'success' | 'already_converted' | 'error'

const STATUS_MESSAGES: Record<ConversionStatus, string> = {
  idle: 'La conversión se anota solo acá. Cargar la página no cuenta.',
  success: 'Conversión registrada para tu visitante asignado. Un segundo clic no suma otra.',
  already_converted: 'Este visitante ya registró su conversión. No se vuelve a sumar.',
  error: 'Sin variante asignada (por ejemplo en modo preview): no se registra conversión.',
}

export function Cta({ label }: { label: string }) {
  const [status, setStatus] = useState<ConversionStatus>('idle')
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await recordConversion()
            setStatus(result.status)
          })
        }}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {label}
      </button>
      <p className="max-w-md text-sm text-muted-foreground">{STATUS_MESSAGES[status]}</p>
    </div>
  )
}
