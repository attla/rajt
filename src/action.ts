// import { Context, Handler, HonoRequest, MiddlewareHandler, Next, ValidationTargets } from 'hono'
// import { JSONValue } from 'hono/utils/types'
import { Context, Handler, ValidationTargets } from 'hono'
import { z, ZodObject } from 'zod'
import { zValidator } from '@hono/zod-validator'
import Response from './response'
import cx from './context'

export type ActionType = Function | Handler | Action | (new () => Action)

type RuleDefinition = {
  schema: z.ZodObject<any>
  target: keyof ValidationTargets
  eTarget?: 'fieldErrors' | 'formErrors'
}

export default class Action {
  static rule<T extends keyof ValidationTargets>(target: T): { schema: (schema: ZodObject<any>) => RuleDefinition }
  static rule<T extends keyof ValidationTargets>(target: T, schema: ZodObject<any>): RuleDefinition
  static rule<T extends keyof ValidationTargets>(target: T, schema?: ZodObject<any>):
    | { schema: (schema: ZodObject<any>) => RuleDefinition }
    | RuleDefinition
  {
    if (schema !== undefined) {
      return {
        target,
        schema,
        eTarget: 'fieldErrors' // | 'formErrors'
      } satisfies RuleDefinition
    }

    return {
      schema: (schema: ZodObject<any>) => ({
        target,
        schema,
        eTarget: 'fieldErrors' // | 'formErrors'
      })
    }
  }

  static validate() {
    const rules = this.rules()
    const h = async (c: Context) => {
      return await this.handle(cx.cx)
    }
    if (!rules) return [h]

    const rulesArray: Function[] = (Array.isArray(rules) ? rules : [rules])
      // @ts-ignore
      .map(rule => zValidator(rule.target, rule.schema, (result, c) => {
        if (!result.success) {
          // @ts-ignore
          return Response.badRequest({ ...result.error.flatten()[rule.eTarget] })
        }
      }))

    rulesArray.push(h)
    return rulesArray
  }

  static run() {
    return this.validate()
  }

  static rules(): RuleDefinition[] | RuleDefinition | null {
    return null
  }

  static async handle(c: Context): Promise<Response> {
    return Promise.resolve(Response.raw(200, 'Action handle not implemented'))
  }
}
