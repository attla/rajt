import { fileURLToPath } from 'node:url'
import { basename, dirname, join, relative } from 'node:path'
import { spawn } from 'node:child_process'

import chalk from 'chalk'
import chokidar from 'chokidar'
import { createCommand } from '../../core/create-command'
import type { ChokidarEventName } from '../../types'

import { build, createMiniflare } from './utils'
import { getAvailablePort } from '../../../utils/port'

const __dirname = join(dirname(fileURLToPath(import.meta.url)), '../../../../../../')

export default createCommand({
	metadata: {
		description: '💻 Start the localhost server\n',
		status: 'stable',
	},
	positionalArgs: ['platform', 'port', 'host'],
	args: {
		port: {
			describe: 'Port to listen on',
			type: 'number',
			default: 3000,
		},
		host: {
			describe: 'Host to forward requests to, defaults to the zone of project',
			type: 'string',
			default: 'localhost',
		},
		p: {
			describe: 'Environment platform',
			alias: 'platform',
			choices: ['aws', 'cf', 'node'] as const,
			requiresArg: true,
		},
	},
	async handler(args) {
		const platform = args.p || args.platform
		const desiredPort = args.port ? Number(args.port) : 3000
		const host = args.host ? String(args.host) : 'localhost'
		switch (platform) {
			case 'aws': return logger.log('dev awss!')
			case 'cf': return withPort(desiredPort, async (port) => {
				let isBuilding = false

				const buildWorker = async () => {
					if (isBuilding) return
					isBuilding = true
					logger.step('Building worker')
					try {
						await build(platform)
						await startWorker()
					} catch (e) {
						logger.error('❌ Build failed:', e)
					} finally {
						isBuilding = false
					}
				}

				let worker = null
				const startWorker = async () => {
					if (worker) await worker.dispose()

					worker = await createMiniflare({ port, host, liveReload: false })
				}

				await buildWorker()
				logger.step(`API running on http://${host}:${port}`)

				watch(async () => {
    			logger.step('Restarting server')
      		await buildWorker()
      		logger.step('Server restarted')
				})
			})
			case 'node':
				return spawn(process.execPath, [
						join(__dirname, 'node_modules/.bin/tsx'), 'watch', join(__dirname, 'node_modules/rajt/src/dev.ts'),
					],
					{
						stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
						env: {...process.env},
					}
				).on('exit', code => process.exit(code === undefined || code === null ? 0 : code))
				.on('message', msg => {
					if (process.send) process.send(msg)
				}).on('disconnect', () => {
					if (process.disconnect) process.disconnect()
				})
			default: return logger.warn(
				`🟠 Provide a valid platform: ${['aws', 'cf', 'node'].map(p => chalk.hex("#FF8800")(p)).join(', ')}.\n`
			)
    }
	},
})

function withPort(desiredPort: number, cb: (port: number) => void) {
	getAvailablePort(desiredPort)
		.then(cb).catch(e => logger.error('Error finding available port:', e))
}

function setupShutdown(cb: (signal: string, e: unknown) => void) {
	const shutdown = async (signal: string, e: unknown) => {
		logger.step(`${signal} received, shutting down`)
		await cb(signal, e)
	}

	process.on('SIGINT', e => shutdown('SIGINT', e))
	process.on('SIGTERM', e  => shutdown('SIGTERM', e))
	process.on('SIGHUP', e => shutdown('SIGHUP', e))
	process.on('unhandledRejection', e => shutdown('UNCAUGHT_REJECTION', e))
	process.on('uncaughtException', e => shutdown('UNCAUGHT_EXCEPTION', e))
}

function getAssetChangeMessage(
	e: ChokidarEventName,
	path: string
): string {
	path = relative(__dirname, path)
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

async function watch(cb: (e: ChokidarEventName | string, file: string) => Promise<void>) {
	const codeWatcher = chokidar.watch([
		join(__dirname, 'actions/**/*.ts'),
		join(__dirname, 'configs/**/*.ts'),
		join(__dirname, 'enums/**/*.ts'),
		join(__dirname, 'locales/**/*.ts'),
		join(__dirname, 'middlewares/**/*.ts'),
		join(__dirname, 'models/**/*.ts'),
		join(__dirname, 'utils/**/*.ts'),
		join(__dirname, '.env.dev'),
		join(__dirname, '.env.prod'),
		join(__dirname, 'package.json'),
		join(__dirname, 'wrangler.toml'),
	], {
		ignored: /(^|[/\\])\../, // ignore hidden files
		persistent: true,
		ignoreInitial: true,
		awaitWriteFinish: {
			stabilityThreshold: 200,
			pollInterval: 100
		},
	})
	let restartTimeout: NodeJS.Timeout | null = null

	const watcher = (e: ChokidarEventName) => async (file: string) => {
		logger.step(getAssetChangeMessage(e, file))

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

	logger.step('Watching for file changes')
}
