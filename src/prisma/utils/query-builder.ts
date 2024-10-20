export interface QueryBuilder<T extends WhereInput<any>> {
  andWhere(where: NonNullable<T['AND']>): NonNullable<T['AND']>
  build(): { AND: T[] }
  raw(): string
}

type WhereInput<T> = {
  AND?: T | T[]
  OR?: T[]
  NOT?: T | T[]
}

export function createQueryBuilder<T extends WhereInput<any>>(): QueryBuilder<T> {
  const result = {} as { AND: T[] }

  return {
    andWhere(where) {
      if (Array.isArray(result.AND)) {
        result.AND.push(where)
      }
      else {
        result.AND = [where]
      }
      return where.AND
    },

    build() {
      return result
    },

    raw() {
      return JSON.stringify(result, null, 2)
    },
  }
}
