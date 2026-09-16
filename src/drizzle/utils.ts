// MARK: - Mappers

export function fromDbNullable<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

export function toDbNullable<T>(value: T | undefined): T | null {
  return value === undefined ? null : value
}

export function fromDbBoolean(value: number): boolean {
  return value !== 0
}

export function toDbBoolean(value: boolean): number {
  return value ? 1 : 0
}

export function fromDbDate(value: string): Temporal.PlainDate {
  return Temporal.PlainDate.from(value)
}

export function toDbDate(value: Temporal.PlainDate): string {
  return value.toString()
}

// MARK: - Normalization

export function normalizeSearchKey(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}
