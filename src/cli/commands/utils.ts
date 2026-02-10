import esbuild from 'esbuild'
import TOML from '@iarna/toml'
import { Miniflare } from 'miniflare'
import { mkdirSync, existsSync, readdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'

import chokidar from 'chokidar'
import { gray } from '../../utils/colors'
import type { ChokidarEventName, Platform } from './types'

import { cacheRoutes } from '../../routes'
import { step, substep, event, error, wait as wwait, warn, log } from '../../utils/log'
import { platforms } from './constants'

export const _root = join(dirname(new URL(import.meta.url).pathname), '../../../../../')
export const __rajt = join(_root, 'node_modules/rajt/src')

export function normalizePlatform(platform: Platform) {
  platform = platform?.toLowerCase() as Platform
  if (!platforms?.includes(platform)) return null

  switch (platform) {
    case 'lambda':
      return 'aws'

    case 'cloudflare':
    case 'worker':
    case 'workers':
      return 'cf'

    // case 'bun':
    //   return 'node'

    default:
      return platform
  }
}

export const platformError = () => error(`Provide a valid platform: ${platforms.map(p => gray(p)).join(', ')}.\n`)

export function getRuntime() {
  try {
    return process?.isBun || typeof Bun != 'undefined' ? 'bun' : 'node'
  } catch {
    return 'node'
  }
}

export const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes}b`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}kb`
  return `${(bytes / (1024 * 1024)).toFixed(2)}mb`
}

export const formatTime = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

const nodeModules = [
  'crypto', 'buffer', 'http', 'fs', 'path', 'events', 'stream', 'util',
  'url', 'querystring', 'os', 'child_process', 'cluster', 'dns', 'net',
  'tls', 'https', 'zlib', 'readline', 'repl', 'vm', 'module', 'assert',
  'timers', 'string_decoder', 'punycode', 'perf_hooks', 'dgram', 'tty',
  'worker_threads', 'wasi'
].flatMap(lib => ['node:'+ lib, lib])

const dist = '.rajt/dist'
export const build = async (platform: Platform) => {
  const startTime = Date.now()

  const isCF = platform == 'cf'
  const distDir = join(_root, dist)

  existsSync(distDir)
    ? readdirSync(distDir).forEach(file => rmSync(join(distDir, file), { recursive: true, force: true }))
    : mkdirSync(distDir, { recursive: true })

  if (isCF) {
    for (let file of [
      'wrangler.toml',
    ]) {
      file = join(_root, file)
      if (existsSync(file))
        copyFileSync(file, join(_root, dist, basename(file)))
    }
  }

  if (['bun', 'vercel'].includes(platform)) platform = 'cf'

  // @ts-ignore
  platform = platform != 'node' ? '-'+ platform : ''
  const opts = {
    entryPoints: [join(__rajt, `prod${platform}.ts`)],
    bundle: true,
    minify: true,
    outfile: join(_root, dist +'/index.js'),
    format: 'esm',
    target: isCF ? 'es2022' : 'node20',
    // platform: 'neutral',
    platform: isCF ? 'browser' : 'node',
    conditions: isCF ? ['worker', 'browser'] : [],
    treeShaking: true,
    legalComments: 'none',
    external: [
      '@aws-sdk', '@smithy',
      ...(isCF ? [
        'cloudflare:workers',
        ...nodeModules,
      ] : []),
    ],
    metafile: true,
    write: false,
    // define: {
    //   'process.env.NODE_ENV': '"development"'
    // },
    // loader: {
    //   '.ts': 'ts',
    //   '.js': 'js'
    // },
    // tsconfig: join(_root, 'tsconfig.json'),
    // sourcemap: true,
    // logLevel: 'info',
    plugins: [
      {
        name: 'preserve-class-names',
        setup(build) {
          build.onLoad(
            { filter: /(actions|features|routes)\/.*\.ts$/ },
            async (args) => {
              const contents = await readFile(args.path, 'utf8')
              const result = await esbuild.transform(contents, {
                loader: 'ts',
                minify: true,
                keepNames: true
              })
              return { contents: result.code, loader: 'ts' }
            }
          )
        },
      },
      {
        name: 'remove-use-strict',
        setup(build) {
          build.onEnd(async (result) => {
            if (!result.outputFiles) return

            const files = result.outputFiles.filter(file => file.path.endsWith('.js'))
            await Promise.all(files.map(async file => {
              if (!file.path.endsWith('.js')) return

              await writeFile(
                file.path,
                new TextDecoder()
                  .decode(file.contents)
                  .replace(/(["'`])\s*use strict\s*\1;?|`use strict`;?/g, '')
              )
            }))
          })
        }
      },
    ],
  }

  await cacheRoutes()

  event('Routes cached')

  const result = await esbuild.build(opts)
  if (!result?.metafile) throw Error('build fail')

  const stats = await stat(opts.outfile)
  const size = formatSize(stats.size)

  event('Build done in '+ formatTime(Date.now() - startTime))
  substep(
    // `${relative(join(_root, 'node_modules/rajt/src'), opts.entryPoints[0])} → ${relative(_root, opts.outfile)}`,
    `Size: ${size}`,
    `Files: ${Object.keys(result.metafile.outputs).length}`
  )
}

async function parseWranglerConfig(file: string) {
  try {
    return TOML.parse(await readFile(join(_root, file), 'utf-8'))
  } catch (e) {
    warn(`Could not parse ${file}, using defaults`)
    return {}
  }
}

export async function createMiniflare(options = {}, configPath = 'wrangler.toml') {
  const config = await parseWranglerConfig(configPath)

  return new Miniflare({
    host: options.host || 'localhost',
    port: options.port || 8787,
    https: options.https || false,
    httpsKey: options.httpsKey,
    httpsCert: options.httpsCert,
    liveReload: options.liveReload !== false,
    updateCheck: false,

    scriptPath: join(_root, dist +'/index.js'),
    compatibilityDate: config.compatibility_date || '2024-11-01',
    compatibilityFlags: config.compatibility_flags || [
      'nodejs_compat',
    ],

    bindings: {
      // MY_VARIABLE: 'value',
      // ENVIRONMENT: 'development',
      ...config.vars,
    },

    d1Databases: Array.isArray(config.d1_databases) ? Object.fromEntries(config.d1_databases.map(db => [db.binding, db.database_id])) : {},

    modules: [
      { type: 'ESModule', path: dist +'/index.js' },
    ],
    // modules: true,
    // modulesRules: [
    //   { type: 'ESModule', include: ['**/*.js', '**/*.ts'] },
    // ],

    kvPersist: join(_root, '.wrangler/state/v3/kv'),
    cachePersist: join(_root, '.wrangler/state/v3/cache'),
    d1Persist: join(_root, '.wrangler/state/v3/d1'),
    r2Persist: join(_root, '.wrangler/state/v3/r2'),
    durablesPersist: join(_root, '.wrangler/state/v3/durable_objects'),

    verbose: false,

    // Logging
    // log: new console.Console({
    //   stdout: process.stdout,
    //   stderr: process.stderr,
    //   inspectOptions: { depth: 3 }
    // }),

    cfFetch: false, // disable cf requests
    upstream: config.upstream || 'https://example.com',

    sitePath: config.site?.bucket ?
      join(_root, config.site.bucket) : undefined,
    siteInclude: config.site?.include || ['**/*'],
    siteExclude: config.site?.exclude || [],

    globalAsyncIO: true,
    globalTimers: true,
    globalRandom: true,

    inspectorPort: options.inspectorPort || 9229,

    cache: true,
    cacheWarnUsage: true,

    ...options
  })
}

function getAssetChangeMessage(
	e: ChokidarEventName,
	path: string
): string {
	path = relative(_root, path)
	switch (e) {
		case 'add':
			return `File ${path} was added`
		case 'addDir':
			return `Directory ${path} was added`
		case 'unlink':
			return `File ${path} was removed`
		case 'unlinkDir':
			return `Directory ${path} was removed`
		case 'change':
		default:
			return `${path} changed`
	}
}

export async function watch(cb: (e: ChokidarEventName | string, file: string) => Promise<void>) {
	const codeWatcher = chokidar.watch([
		join(_root, '{actions,features,routes,configs,enums,libs,locales,middlewares,models,utils}/**/*.ts'),
		join(_root, '.env.dev'),
		join(_root, '.env.prod'),
		join(_root, 'package.json'),
		join(_root, 'wrangler.toml'),
	], {
		ignored: /(^|[/\\])\../, // ignore hidden files
		persistent: true,
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 200,
			pollInterval: 100,
		},
	})
	let restartTimeout: NodeJS.Timeout | null = null

	const watcher = (e: ChokidarEventName) => async (file: string) => {
		log(getAssetChangeMessage(e, file))

		if (restartTimeout)
			clearTimeout(restartTimeout)

		restartTimeout = setTimeout(async () => {
			await cb(e, file)
		}, 300)
	}

	codeWatcher.on('change', watcher('change'))
	codeWatcher.on('add', watcher('add'))
	codeWatcher.on('unlink', watcher('unlink'))
	codeWatcher.on('addDir', watcher('addDir'))
	codeWatcher.on('unlinkDir', watcher('unlinkDir'))

	wwait('Watching for file changes')
}

export async function wait(ms: number) {
	return new Promise(r => setTimeout(r, ms))
}

export function getDockerHost() {
	const platform = process.platform

	if (platform == 'darwin') {
		for (const socket of [
			'/Users/'+ process.env.USER +'/.docker/run/docker.sock',
			'/var/run/docker.sock',
			process.env.DOCKER_HOST
		]) {
			if (socket && existsSync(socket.replace(/^unix:\/\//, '')))
				return socket.includes('://') ? socket : `unix://${socket}`
		}

		return 'tcp://localhost:2375'
	}

	return process.env.DOCKER_HOST || (platform == 'win32' ? 'tcp://localhost:2375' : 'unix:///var/run/docker.sock')
}

export function makeFile(path: string, content: string) {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  writeFileSync(path, content)
}

export function hasExt(path: string) {
  const index = path.lastIndexOf('.')
  return index > 0 && index < path.length - 1
}

function normalizeText(text: string, separator = '_') {
  const validSeparators = ['_', '-']
  const sep = validSeparators.includes(separator) ? separator : '_'

  const lastDotIndex = text.lastIndexOf('.')
  const hasExtension = lastDotIndex > 0 && lastDotIndex < text.length - 1
  const fileName = hasExtension ? text.substring(0, lastDotIndex) : text
  const extension = hasExtension ? text.substring(lastDotIndex + 1) : ''

  const normalizedName = fileName
    .replace(/([a-z])([A-Z])/g, `$1${sep}$2`)
    .replace(/[\s\-_]+/g, sep)
    .toLowerCase()
    .replace(new RegExp(`[^\\w${sep}]+`, 'g'), '')
    .replace(new RegExp(`${sep}{2,}`, 'g'), sep)
    .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '')

  return hasExtension ? `${normalizedName}.${extension}` : normalizedName
}

export const snakeCase = (text: string) => normalizeText(text, '_')
export const kebabCase = (text: string) => normalizeText(text, '-')

export const camelCase = (text: string) =>
  text.replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
