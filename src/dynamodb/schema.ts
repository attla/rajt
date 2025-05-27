import { z, ZodTypeAny } from 'zod'
import type { SchemaStructure } from './types'

function extractZodKeys(schema: ZodTypeAny): SchemaStructure {
  if (schema instanceof z.ZodObject) {
    return Object.entries(schema.shape).map(([key, value]) => {
      const inner = unwrap(value as ZodTypeAny)

      if (inner instanceof z.ZodObject)
        return { [key]: extractZodKeys(inner) }

      if (inner instanceof z.ZodArray) {
        const item = unwrap(inner._def.type as ZodTypeAny)
        return item instanceof z.ZodObject ? { [key]: extractZodKeys(item) } : key
      }

      return key
    })
  }

  return []
}

function unwrap(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    return unwrap(schema._def.innerType)

  if (schema instanceof z.ZodUnion)
    return unwrap(schema._def.options[0] as ZodTypeAny)

  return schema
}

export function Schema<
  T extends ZodTypeAny,
  B extends object
>(
  schema: T,
  BaseClass?: new (...args: any[]) => B
) {
  const Base = (BaseClass || class {})

  return class extends Base {
    static _schema = schema
    static defaultSortKey?: string

    #PK?: string
    #SK?: string

    constructor(data: z.infer<T>) {
      super()
      Object.assign(this, data)
    }

    get PK() { return this.#PK }
    get SK() { return this.#SK }

    static get schema() {
      return extractZodKeys(this._schema)
    }

    static get defaultSK() {
      return this.defaultSortKey
    }

    withKey(key: string, sk?: string) {
      this.#PK = key
      if (sk) this.#SK = sk
      return this
    }
  }
}
