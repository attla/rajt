import { Envir, parseUA } from 't0n'
import { Token as Factory, sha256 } from 'cripta'
import type { IRequest } from '@/types'

const STABLE_HEADERS = [
  'host',
  'connection',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'upgrade-insecure-requests',
  'user-agent',
  'accept',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-user',
  'sec-fetch-dest',
  'accept-encoding',
  'accept-language',
]

function headerOrdering(headers: Record<string, string>) {
  const order: string[] = []

  for (const name in headers) {
    const key = name.toLowerCase()

    if (STABLE_HEADERS.includes(key))
      order.push(key)
  }

  return order
}

export class Token {
  static #cookieName: string = '__auth_'
  static #name: string = 'Authorization'
  static #prefix: string = 'bearer'

  static fromRequest(req: IRequest) {
    const token = this.fromCookie(req) || this.fromHeader(req)
    return token ? this.parse(req, token) : null
  }

  static fromHeader(req: IRequest): string | null {
    const header = req.header(this.#name) || req.header('HTTP_AUTHORIZATION') || req.header('REDIRECT_HTTP_AUTHORIZATION') || null

    if (header) {
      const pos = header.toLowerCase().indexOf(this.#prefix.toLowerCase())
      if (pos < 0) return header

      let token = header.slice(pos + this.#prefix.length).trim()
      const commaPos = token.indexOf(',')
      if (commaPos > -1) token = token.slice(0, commaPos).trim()

      return token
    }

    return null
  }

  static fromCookie(req: IRequest): string | null {
    const uid = req.header('uid')

    if (uid) {
      const auth = req.cookie.get(this.#cookieName + uid)
      return auth ? auth : null
    }

    return null
  }

  static parse(req: IRequest, token: string) {
    const host = this.host(req)
    const serveHost = Envir.get('FLOW_SERVER', host) as string

    return Factory.parse(token)
      .issuedBy(serveHost)
      .permittedFor(host)
      .withClaim('_', this.fingerprint(req))
  }

  static create(req: IRequest, user: any, exp: number = 7200) {
    const time = Math.floor(Date.now() / 1000)
    const host = this.host(req)

    return Factory.create()
      .issuedBy(host)
      .permittedFor(host)
      .issuedAt(time)
      .expiresAt(time + exp)
      .withClaim('_', this.fingerprint(req))
      .body(user)
  }

  static setPrefix(prefix: string): void {
    this.#prefix = prefix
  }

  static setName(name: string): void {
    this.#name = name
  }

  static host(req: IRequest): string {
    const url = req.url || req.header('host')
    if (!url) return ''

    let formattedUrl = String(url)
    if (!formattedUrl.startsWith('http'))
      formattedUrl = 'http://' + formattedUrl

    try {
      const parsedUrl = new URL(formattedUrl)
      return parsedUrl.host
    } catch {
      return ''
    }
  }

  static fingerprint(req: IRequest) {
    const ua = parseUA(req.header('user-agent'))

    const id = sha256(
      // (req.header('accept-language') || '')
      this.ip(req)
      + ua.browser.name + ua.browser.version.split('.')[0]
      + ua.os.type + ua.os.name
      + headerOrdering(req.header()).join('')
    )

    return id.substring(0, 8) + id.substring(56, 64)
  }

  static ip(req: IRequest) {
     return req?.ip || 0
  }
}
