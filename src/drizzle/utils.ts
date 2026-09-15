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

export function fromDbTimestamp(value: number): Date {
  return new Date(value * 1_000)
}

export function toDbTimestamp(value: Date): number {
  return Math.round(value.getTime() / 1_000)
}

export function dbNow(): number {
  return Math.round(Date.now() / 1_000)
}

// MARK: - Normalization

export function normalizeSearchKey(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}
