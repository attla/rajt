import fs from 'node:fs'
import path, { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Route } from './types'
import { registerHandler } from './register'
import { isAnonFn } from './utils/func'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default async function getRoutes(all: boolean = false, baseDir: string = 'actions'): Promise<Route[]> {
  const routes: Route[] = []

  const walk = async (dir: string, middlewares: Function[] = []): Promise<void> => {
    const files = fs.readdirSync(dir)

    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        const indexFile = path.join(fullPath, 'index.ts')

        if (fs.existsSync(indexFile)) {
          const mod = await import(indexFile)
          const group = mod.default
          registerHandler(group.name, group)
          !isAnonFn(group) && middlewares.push(group.name)

          all && routes.push({
            method: '',
            path: '',
            name: group.name.replace(/\.ts$/, ''),
            file: baseDir + indexFile.split(baseDir)[1],
            middlewares,
            handle: group,
          })
        }

        await walk(fullPath, middlewares)
      } else if (file.endsWith('.ts')) {
        const mod = await import(fullPath)
        const handle = mod.default

        if (handle?.m) {
          registerHandler(handle.name, handle)

          routes.push({
            method: handle.m.toLowerCase(),
            path: handle.p,
            name: handle.name.replace(/\.ts$/, ''),
            file: baseDir + fullPath.split(baseDir)[1],
            middlewares,
            handle,
          })
        }
      }
    }
  }

  await walk(path.resolve(__dirname, '../../..', baseDir))
  return routes
}
