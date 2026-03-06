import { STATUS_CODES } from 'node:http'
import { generateSpecs, resolver } from 'hono-openapi'
import { array, object, string } from 'zod/mini'
import { Envir } from 't0n'
import type { Hono } from '../types'
import { config } from './register'

export async function generateOpenAPI(app: Hono, conf: any) {
  const opts = config(conf)
  if (opts.disable) return {}

  return await generateSpecs(app, {
    documentation: {
      info: {
        title: opts.appName,
        version: opts.appVersion,
        description: Envir.get('APP_DESCRIPTION', ''),
      },
      components: {
        securitySchemes: {
          JWT: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        responses: {
          500: {
            description: STATUS_CODES[500],
            content: { // @ts-ignore
              'application/json': await resolver(object({
                m: array(string()),
              })).toOpenAPISchema(),
            },
          },
          ...opts?.responses,
        },
      },
    },
  })
}
