import { isDeepStrictEqual } from 'node:util'

// MARK: - Equivalence and Order

/** A type that can perform equality checks.
 *
 * The designer should guarantee that the equality (equivalence relation) is reflexive, symmetric, and transitive.
*/
export interface Equatable {
  isEqual(other: this): boolean
}

/** An {@link Equatable} type that defines also an ordering between some of the possible pairs, allowing for the existence of incomparable pairs (i.e., the type forms a partially ordered set).
 *
 * The designer should guarantee that the comparison (order relation) is reflexive, antisymmetric, and transitive. Also, the comparison should be compatible with the equality.
 *
 * @extends Equatable
*/
export interface MaybeComparable extends Equatable {

  /** @returns `0`, `1`, or `-1` if `this` is respectively equal to, greater than, or lesser than `other`. */
  compareTo(other: this): 0 | 1 | -1 | undefined
}

/** An {@link Equatable} type that defines also an ordering between any two pairs (i.e., the type forms a totally ordered set).
 *
 * The designer should guarantee that the comparison (order relation) is reflexive, antisymmetric, and transitive. Also, the comparison should be compatible with the equality.
 *
 * @extends MaybeComparable
*/
export interface Comparable extends MaybeComparable {

  /** @returns `0`, `1`, or `-1` if `this` is respectively equal to, greater than, or lesser than `other`. */
  compareTo(other: this): 0 | 1 | -1
}

// MARK: - ValueObject

/** The data associated to a {@link ValueObject}. */
export type ValueObjectProps = Record<string, unknown>

/** A type that is fully determined by the contained data, rather than a continouos identity over time.
 *
 * The designer should enforce the immutability of the associated `Props`.
*/
export abstract class ValueObject<Props extends ValueObjectProps> implements Equatable {
  constructor(protected readonly props: Props) {}

  toProps(): Props {
    return { ...this.props }
  }

  isEqual(other: this): boolean {
    return isDeepStrictEqual(this.props, other.props)
  }
}

/** @see {@link ValueObject}, {@link MaybeComparable} */
export abstract class MaybeComparableValueObject<Props extends ValueObjectProps> extends ValueObject<Props> implements MaybeComparable {
  abstract compareTo(other: this): 0 | 1 | -1 | undefined

  isGreater(other: this): boolean {
    return this.compareTo(other) === 1
  }

  isLesser(other: this): boolean {
    return this.compareTo(other) === -1
  }
}

/** @see {@link ValueObject}, {@link Comparable} */
export abstract class ComparableValueObject<Props extends ValueObjectProps> extends MaybeComparableValueObject<Props> implements Comparable {
  abstract compareTo(other: this): 0 | 1 | -1
}
