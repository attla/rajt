import { ZodTypeAny } from 'zod'
import { Dynamodb } from './client'
import { Schema } from './schema'
import { _model } from './decorators'
import type { ModelOpts } from './types'

export function Repository<M extends object, S extends ZodTypeAny>(
  schema: S,
  model: new (...args: any[]) => M,
  opts?: ModelOpts
) {
  const BaseSchemaClass = Schema(schema, model)
  _model(BaseSchemaClass, opts)

  return class extends BaseSchemaClass {
    static model = Dynamodb.model<M>(BaseSchemaClass as unknown as new (...args: any[]) => M)
  } as unknown as (typeof BaseSchemaClass) & {
    model: ReturnType<typeof Dynamodb.model<M>>
    new (...args: any[]): InstanceType<typeof BaseSchemaClass>
  }
}
