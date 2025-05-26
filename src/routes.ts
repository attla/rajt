import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Route } from './types'
import { isAnonFn } from './utils/func'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const importName = (name?: string) => (name || 'Fn'+ Math.random().toString(36).substring(2)).replace(/\.ts$/, '')
const walk = async (dir: string, baseDir: string, fn: Function, parentMw: string[] = []): Promise<void> => {
  if (!existsSync(dir)) return
  const files = readdirSync(dir)

  const currentMw = [...parentMw]
  const indexFile = join(dir, 'index.ts')

  if (existsSync(indexFile)) {
    const mod = await import(indexFile)
    const group = mod.default

    !isAnonFn(group) && group?.mw?.length && currentMw.push(group?.name)
    fn(indexFile, baseDir, group, currentMw)
  }

  for (const file of files) {
    const fullPath = join(dir, file)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      await walk(fullPath, baseDir, fn, currentMw)
    } else if (file !== 'index.ts' && file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      const mod = await import(fullPath)
      fn(fullPath, baseDir, mod.default, currentMw)
    }
  }
}


export async function getRoutes(
  dirs: string[] = ['actions', 'features']
): Promise<Route[]> {
  const routes: Route[] = []
  let mw: string[] = []

  await Promise.all(dirs.map(dir => walk(
    resolve(__dirname, '../../..', dir),
    dir,
    (fullPath: string, baseDir: string, handle: any, middlewares: string[]) => {
      const name = importName(handle?.name)
      const file = baseDir + fullPath.split(baseDir)[1]

      routes.push({
        method: handle?.m?.toLowerCase() || '',
        path: handle?.p || '',
        name,
        file,
        // @ts-ignore
        middlewares,
        handle,
      })
    }
  )))

  return routes
}

export async function getMiddlewares(
  dirs: string[] = ['middlewares']
): Promise<Route[]> {
  const mw: Route[] = []

  await Promise.all(dirs.map(dir => walk(
    resolve(__dirname, '../../..', dir),
    dir,
    (fullPath: string, baseDir: string, handle: any) => {
      // @ts-ignore
      mw.push({
        name: importName(handle?.name),
        file: baseDir + fullPath.split(baseDir)[1],
        handle,
      })
    }
  )))

  return mw
}
