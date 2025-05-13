import { z, ZodTypeAny } from 'zod'

function extractZodKeys(schema: ZodTypeAny): any {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    return Object.entries(shape).map(([key, value]) => {
      const inner = unwrap(value as ZodTypeAny)

      if (inner instanceof z.ZodObject) {
        return { [key]: extractZodKeys(inner) }
      }

      if (inner instanceof z.ZodArray) {
        const item = unwrap(inner._def.type as ZodTypeAny)
        if (item instanceof z.ZodObject)
          return { [key]: extractZodKeys(item) }

        return key
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

export default function Schema<T extends ZodTypeAny>(schema: T) {
  return class {
    static _schema = schema

    static getSchema() {
      return extractZodKeys(schema)
    }

    constructor(data: z.infer<T>) {
      Object.assign(this, data)
    }
  }
}
