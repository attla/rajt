import { bufferToFormData } from 'hono/utils/buffer'
import { HTTPException } from 'hono/http-exception'
import type { BodyData } from 'hono/utils/body'
import Response from './response'
import c from './context'

export default class Request {
  static param(key: string) {
    return c.cx.req.param(key)
  }

  static query() {
    return c.cx.req.query()
  }

  static async form(cType?: string) {
    cType ??= c.cx.req.header('Content-Type')
    if (!cType) return {}

    let formData: FormData

    if (c.cx.req.bodyCache.formData) {
      formData = await c.cx.req.bodyCache.formData
    } else {
      try {
        const arrayBuffer = await c.cx.req.arrayBuffer()
        formData = await bufferToFormData(arrayBuffer, cType)
        c.cx.req.bodyCache.formData = formData
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

  static async json<E>() {
    try {
      return await c.cx.req.json<E>()
    } catch {
      throw new HTTPException(400, { message: 'Malformed JSON in request body' })
    }
  }

  static async body<E>() {
    const cType = c.cx.req.header('Content-Type')
    if (!cType) return {} as E

    if (/^application\/([a-z-\.]+\+)?json(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/.test(cType)) {
      return await Request.json<E>()
    }

    if (
      /^multipart\/form-data(;\s?boundary=[a-zA-Z0-9'"()+_,\-./:=?]+)?$/.test(cType)
      && ! /^application\/x-www-form-urlencoded(;\s*[a-zA-Z0-9\-]+\=([^;]+))*$/.test(cType)
    ) {
        return await Request.form() as E
    }

    return {} as E
  }

  static get response() {
    return Response
  }

  static get cx() {
    return c.cx
  }

  static get cookie() {
    return c.cookie
  }

  static get ip() {
    return c.ip
  }

  static get userAgent() {
    return c.userAgent
  }
}
