import { z, ZodTypeAny } from 'zod'
import { Dynamodb } from './client'
import { Schema } from './schema'
import { _model } from './decorators'
import type { ModelOpts } from './types'

export function Repository<
  S extends ZodTypeAny,
  B extends new (...args: any[]) => any
>(
  schema: S,
  base?: B | ModelOpts,
  opts?: ModelOpts
) {
  const isClass = typeof base === 'function'
  type M = z.infer<S>

  const Repo = Schema(schema, isClass ? base : undefined)
  _model(Repo, isClass ? opts : base)

  return class extends Repo {
    static model = Dynamodb.model<M>(Repo as any)

    static get lastKey() {
      return this.model?.lastEvaluatedKey || null
    }
  } as unknown as (typeof Repo) & {
    new (...args: any[]): InstanceType<typeof Repo>
    model: ReturnType<typeof Dynamodb.model<M>>
  }
}
