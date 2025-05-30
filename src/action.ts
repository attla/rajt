// import { Context, Handler, HonoRequest, MiddlewareHandler, Next, ValidationTargets } from 'hono'
// import { JSONValue } from 'hono/utils/types'
import { Context, Handler, ValidationTargets } from 'hono'
import { z, ZodObject } from 'zod'
import { zValidator } from '@hono/zod-validator'
import JsonResponse from './response'
import { bufferToFormData } from 'hono/utils/buffer'
import { HTTPException } from 'hono/http-exception'
import { BodyData } from 'hono/utils/body'

export type ActionType = Function | Handler | Action | (new () => Action)

type RuleDefinition = {
  schema: z.ZodObject<any>
  target: keyof ValidationTargets
  eTarget?: 'fieldErrors' | 'formErrors'
}

export default abstract class Action {
  rule<T extends keyof ValidationTargets>(target: T): { schema: (schema: ZodObject<any>) => RuleDefinition }
  rule<T extends keyof ValidationTargets>(target: T, schema: ZodObject<any>): RuleDefinition
  rule<T extends keyof ValidationTargets>(target: T, schema?: ZodObject<any>):
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

  param(key: string) {
    return this.cx.req.param(key)
  }

  query() {
    return this.cx.req.query()
  }

  async form(cType?: string) {
    cType ??= this.cx.req.header('Content-Type')
    if (!cType) return {}

    let formData: FormData

    if (this.cx.req.bodyCache.formData) {
      formData = await this.cx.req.bodyCache.formData
    } else {
      try {
        const arrayBuffer = await this.cx.req.arrayBuffer()
        formData = await bufferToFormData(arrayBuffer, cType)
        this.cx.req.bodyCache.formData = formData
      } catch (e) {
        throw new HTTPException(400, {
          message: 'Malformed FormData request.'
                   + (e instanceof Error ? ` ${e.message}` : ` ${String(e)}`)
        })
      }
    }

    const form: BodyData<{ all: true }> = {}
    formData.forEach((value, key) => {
      if (key.endsWith('[]')) {
        ;((form[key] ??= []) as unknown[]).push(value)
      } else if (Array.isArray(form[key])) {
        ;(form[key] as unknown[]).push(value)
      } else if (key in form) {
        form[key] = [form[key] as string | File, value]
      } else {
        form[key] = value
      }
    })

    return form
  }

  async json<E>() {
    try {
      return await this.cx.req.json<E>()
    } catch {
      throw new HTTPException(400, { message: 'Malformed JSON in request body' })
    }
  }

  async body<E>() {
    const cType = this.cx.req.header('Content-Type')
    if (!cType) return {} as E

    if (/^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/.test(cType)) {
      return await this.json<E>()
    }

    if (
      /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/.test(cType)
      && ! /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/.test(cType)
    ) {
        return await this.form() as E
    }

    return {} as E
  }

  get response() {
    return JsonResponse
  }

  get cx() {
    return JsonResponse.cx
  }

  get cookie() {
    return JsonResponse.cookie
  }

  validate() {
    const rules = this.rules()
    const h = async (c: Context) => {
      return await this.handle(this.cx)
    }
    if (!rules) return [h]

    const rulesArray = (Array.isArray(rules) ? rules : [rules])
      .map(rule => zValidator(rule.target, rule.schema, (result, c) => {
        if (!result.success) {
          // @ts-ignore
          return JsonResponse.badRequest({ ...result.error.flatten()[rule.eTarget] })
        }
      }))

    rulesArray.push(h)
    return rulesArray
  }

  run() {
    return this.validate()
  }

  // PUBLIC API

  get auth() {
    const auth = this.cx.get('#auth')
    return auth ? auth?.data : null
  }

  can(...abilities: string[]): boolean {
    const auth = this.cx.get('#auth')
    return auth ? auth.can(...abilities) : false
  }

  cant(...abilities: string[]): boolean {
    return !this.can(...abilities)
  }

  hasRole(...roles: string[]): boolean {
    const auth = this.cx.get('#auth')
    return auth ? auth.hasRole(...roles) : false
  }

  rules(): RuleDefinition[] | RuleDefinition | null {
    return null
  }

  abstract handle(c: Context): Promise<Response>
}
