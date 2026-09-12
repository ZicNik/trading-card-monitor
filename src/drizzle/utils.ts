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

// MARK: - Normalization

export function normalizeSearchKey(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}
