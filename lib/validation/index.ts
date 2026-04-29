import { NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }

export function parseBody<T>(schema: ZodSchema<T>, data: unknown): ParseResult<T> {
  const result = schema.safeParse(data)
  if (result.success) return { ok: true, data: result.data }

  const message = formatZodError(result.error)
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status: 400 }),
  }
}

function formatZodError(err: ZodError): string {
  return err.errors
    .map((e) => {
      const path = e.path.length > 0 ? `${e.path.join('.')}: ` : ''
      return `${path}${e.message}`
    })
    .join('; ')
}

export * from './schemas'
