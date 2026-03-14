import { zValidator } from '@hono/zod-validator'
import response from './response'
import type * as z from 'zod'
import type {
  Rule, Rules, RuleFn,
  ValidationTargets,
  zObject,
  MiddlewareHandler,
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

  static #parser = (rule: Rule) => zValidator(rule.target, rule.schema, (result, c) => {
    if (!result.success) // @ts-ignore
      return response.badRequest(formatZodErrors(result.error.issues || []))
  })

  static setParser(parser: (rule: Rule) => MiddlewareHandler) {
    this.#parser = parser
  }

  static parse(rules: Rules): Function[] {
    return (Array.isArray(rules) ? rules : [rules]) // @ts-ignore
      .flatMap(this.#parser)
  }
}

function formatZodErrors(issues: z.ZodIssue[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}

  for (const issue of issues) {
    const path = issue.path.join('.')
    const key = path || 'root'

    if (!result[key])
      result[key] = []

    result[key].push(issue.message)
  }

  return result
}
