import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Route } from './types'
import { registerHandler } from './register'
import { isAnonFn } from './utils/func'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default async function getRoutes(
  all: boolean = false,
  dirs: string[] = ['actions', 'features', 'errors', 'middlewares']
): Promise<Route[]> {
  const routes: Route[] = []

  const walk = async (dir: string, baseDir: string, middlewares: Function[] = []): Promise<void> => {
    if (!existsSync(dir)) return
    const files = readdirSync(dir)

    for (const file of files) {
      const fullPath = join(dir, file)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        const indexFile = join(fullPath, 'index.ts')

        if (existsSync(indexFile)) {
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

        await walk(fullPath, baseDir, middlewares)
      } else if (file.endsWith('.ts')) {
        const mod = await import(fullPath)
        const handle = mod.default

        if (handle?.gmw) return
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

  await Promise.all(dirs.map(dir => walk(resolve(__dirname, '../../..', dir), dir)))
  return routes
}
