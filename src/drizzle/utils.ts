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
