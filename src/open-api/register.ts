import { basicAuth } from 'hono/basic-auth'
import { Scalar } from '@scalar/hono-api-reference'
import { Envir } from 't0n'
import response from '../response'
import { getHandler } from '../register'
import type { Hono } from '../types'

export function config(opts: any) {
  const docs = opts?.docs ?? {}

  const appName = Envir.get('APP_NAME', 'API Docs')
  const appVersion = Envir.get('APP_VERSION') || Envir.get('VERSION_HASH') || '1.0.0'

  return {
    ...docs,
    disable: !!docs?.disable,
    path: docs?.path || '/docs',
    auth: docs?.auth || {},
    agent: !docs?.agent,
    appName, appVersion,
  }
}

export function registerOpenAPI(app: Hono, conf: any) {
  const opts = config(conf)
  if (opts.disable) return

  if (opts?.auth?.username && opts?.auth?.password) {
    app.use(opts.path +'/*', async (c, next) => {
      const realm = opts.auth?.realm || 'Docs'
      const unauthorized = response.unauthorized(
        null,
        {'WWW-Authenticate': `Basic realm="${realm.replace(/"/g, '\\"')}", charset="UTF-8"`}
      )
      if (!c.req.raw.headers.get('Authorization')) return unauthorized
      const auth = basicAuth({ username: opts.auth.username, password: opts.auth.password, realm })

      try {
        await auth(c, next)
      } catch {
        return unauthorized
      }
    })
  }

  app.get(opts.path + '/openapi', async () => response.json(getHandler('RAJT_OPENAPI')))

  app.get(
    opts.path,
    Scalar({
      theme: 'saturn',
      url: opts.path +'/openapi',
      showDeveloperTools: 'never',
      telemetry: false,
      documentDownloadType: 'json', //'direct',
      isLoading: true,
      persistAuth: true,
      hideClientButton: true,
      pageTitle: opts.appName,
      agent: { disabled: opts.agent },
      slug: opts.appName?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s_-]/g, '').replace(/[\s_-]+/g, '_').replace(/[^\x00-\x7F]/g, '') +'_'+ opts.appVersion,
      // hideDownloadButton: true,
      // onLoaded: () => document?.querySelectorAll('[href="https://www.scalar.com"]')?.forEach(el => el.remove()),
      customCss: `[href="https://www.scalar.com"],.scalar-mcp-layer{display:none!important}`,
      // favicon: 'https://example.com/favicon.png',
    })
  )
}
