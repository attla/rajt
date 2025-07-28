import { z, ZodTypeAny } from 'zod'
import type { SchemaStructure } from './types'

const m = Symbol('a')
export function isArraySchema(v: any) : boolean {
  return v[m] || false
}

export function extractZodKeys(schema: ZodTypeAny): SchemaStructure {
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

  if (schema instanceof z.ZodArray) {
    const item = unwrap(schema._def.type as ZodTypeAny)
    if (item instanceof z.ZodObject) {
      const r = extractZodKeys(item)
      // @ts-ignore
      r[m] = true
      return r
    }

    return []
  }

  return []
}

export function unwrap(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    return unwrap(schema._def.innerType)

  if (schema instanceof z.ZodDefault)
    return unwrap(schema._def.innerType)

  // if (schema instanceof z.ZodUnion)
  //   return unwrap(schema._def.options[0] as ZodTypeAny)

  if (schema instanceof z.ZodUnion) {
    const options = schema._def.options as ZodTypeAny[]
    const nonEmptyOption = options.find(opt => !(opt instanceof z.ZodUndefined) && !(opt instanceof z.ZodNull))
    return nonEmptyOption ? unwrap(nonEmptyOption) : options[0]
  }

  if (schema instanceof z.ZodEffects)
    return unwrap(schema._def.schema)

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
