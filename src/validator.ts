import { zValidator } from '@hono/zod-validator'
import response from './response'
import type {
  Rule, Rules, RuleFn,
  ValidationTargets,
  zObject,
} from './types'

export default class $Validator {
  private static cache = new Map<string, RuleFn>()

  private static createRule<T extends keyof ValidationTargets>(
    target: T,
    schema: zObject
  ): Rule {
    return {
      target,
      schema,
      eTarget: 'fieldErrors'
    }
  }

  private static fn<T extends keyof ValidationTargets>(target: T) {
    if (this.cache.has(target))
      return this.cache.get(target)

    const fn = (schema: zObject) => this.createRule(target, schema)
    this.cache.set(target, fn)
    return fn
  }

  static readonly json = $Validator.fn('json')!
  static readonly form = $Validator.fn('form')!
  static readonly query = $Validator.fn('query')!
  static readonly param = $Validator.fn('param')!
  static readonly header = $Validator.fn('header')!
  static readonly cookie = $Validator.fn('cookie')!

  static parse(rules: Rules): Function[] {
    return (Array.isArray(rules) ? rules : [rules]) // @ts-ignore
      .flatMap(rule => zValidator(rule.target, rule.schema, (result, c) => {
        if (!result.success) // @ts-ignore
          return response.badRequest({ ...result.error.flatten()[rule.eTarget] })
      }))
  }
}
