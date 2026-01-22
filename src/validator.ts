import { ZodObject } from 'zod'
import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { Rule, Rules } from './types'
import response from './response'

export default class $Validator {
  private static cache = new Map<string, any>()

  private static createRule<T extends keyof ValidationTargets>(
    target: T,
    schema?: ZodObject<any>
  ):
    | { schema: (schema: ZodObject<any>) => Rule }
    | Rule
  {
    if (schema !== undefined) {
      return {
        target,
        schema,
        eTarget: 'fieldErrors'
      } satisfies Rule
    }

    return {
      schema: (schema: ZodObject<any>) => ({
        target,
        schema,
        eTarget: 'fieldErrors'
      })
    }
  }

  private static getOrCreateAlias<T extends keyof ValidationTargets>(target: T) {
    if (this.cache.has(target))
      return this.cache.get(target)

    const aliasFunc = (schema?: ZodObject<any>) => {
      if (schema !== undefined)
        return this.createRule(target, schema)

      return this.createRule(target)
    }

    const typedAlias = aliasFunc as {
      (): { schema: (schema: ZodObject<any>) => Rule },
      (schema: ZodObject<any>): Rule,
    }

    this.cache.set(target, typedAlias)
    return typedAlias
  }

  static readonly json = $Validator.getOrCreateAlias('json')
  static readonly form = $Validator.getOrCreateAlias('form')
  static readonly query = $Validator.getOrCreateAlias('query')
  static readonly param = $Validator.getOrCreateAlias('param')
  static readonly header = $Validator.getOrCreateAlias('header')
  static readonly cookie = $Validator.getOrCreateAlias('cookie')

  static parse(rules: Rules): Function[] {
    return (Array.isArray(rules) ? rules : [rules]) // @ts-ignore
      .flatMap(rule => zValidator(rule.target, rule.schema, (result, c) => {
        if (!result.success) // @ts-ignore
          return response.badRequest({ ...result.error.flatten()[rule.eTarget] })
      }))
  }
}
