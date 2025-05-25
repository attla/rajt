import { Envir } from 't0n'
import { Token as Factory } from 'cripta'
import type { Context, HonoRequest, Next } from 'hono'

export class Token {
  static #name: string = 'Authorization'
  static #prefix: string = 'bearer'

  static fromRequest(c: Context) {
    return token ? this.parse(c.req, token) : null
  }

  static fromHeader(req: HonoRequest): string | null {
    const header = req.header(this.#name) || req.header('HTTP_AUTHORIZATION') || req.header('REDIRECT_HTTP_AUTHORIZATION') || null

    if (header) {
      const position = header.toLowerCase().indexOf(this.#prefix.toLowerCase())
      if (position !== -1) {
        let token = header.slice(position + this.#prefix.length).trim()
        const commaPos = token.indexOf(',')
        if (commaPos !== -1) token = token.slice(0, commaPos).trim()

        return token
      }
    }

    return null
  }

  static parse(req: HonoRequest, token: string) {
    const host = this.host(Envir.get('FLOW_SERVER') || req.header('host') || '')

    return Factory.parse(token)
      .issuedBy(host)
      .permittedFor(host)
  }

  static create(req: HonoRequest, user: any, exp: number = 7200) {
    const time = Math.floor(Date.now() / 1000)
    const host = this.host(req.header('host') || '')

    return Factory.create()
      .issuedBy(host)
      .permittedFor(host)
      .issuedAt(time)
      .expiresAt(time + exp)
      .body(user)
  }

  static setPrefix(prefix: string): void {
    this.#prefix = prefix
  }

  static setName(name: string): void {
    this.#name = name
  }

  static host(url: string | null | undefined): string {
    if (!url) return ''

    let formattedUrl = String(url)
    if (!formattedUrl.startsWith('http'))
      formattedUrl = 'http://' + formattedUrl

    try {
      const parsedUrl = new URL(formattedUrl)
      return parsedUrl.host
    } catch (e) {
      return ''
    }
  }
}
