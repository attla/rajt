import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

import chokidar from 'chokidar'
import colors from 'picocolors'
import { defineCommand } from 'citty'
import type { ChokidarEventName } from '../../types'

import type { Miniflare } from 'miniflare'
import { build, createMiniflare } from './utils'
import { getAvailablePort } from '../../../utils/port'
import shutdown from '../../../utils/shutdown'

const __dirname = join(dirname(fileURLToPath(import.meta.url)), '../../../../../../')

export default defineCommand({
	meta: {
		name: 'dev',
		description: '💻 Start the localhost server\n',
	},
	args: {
		port: {
			description: 'Port to listen on',
			type: 'number',
			default: 3000,
		},
		host: {
			description: 'Host to forward requests to, defaults to the zone of project',
			type: 'string',
			default: 'localhost',
		},
		platform: {
			alias: 'p',
			description: 'Environment platform',
			type: 'enum',
			options: ['aws', 'cf', 'node'] as const,
			required: true,
		},
	},
	async run({ args }) {
		const platform = args.p || args.platform
		const desiredPort = args.port ? Number(args.port) : 3000
		const host = args.host ? String(args.host) : 'localhost'
		switch (platform) {
			case 'aws':
				return withPort(desiredPort, async (port) => {
					let isBuilding = false
					let lambda: ChildProcess | null = null

					const buildLambda = async () => {
						if (isBuilding) return
						isBuilding = true
						logger.step('Building lambda')
						try {
							await build(platform)
							if (!lambda) await startLambda()
						} catch (e) {
							logger.error('Build failed:', e)
							process.exit(0)
						} finally {
							isBuilding = false
						}
					}

					const stopLambda = async () => {
						if (!lambda) return
						logger.step('Stopping lambda process...')
						try {
							if (!lambda?.killed) {
								lambda.kill('SIGTERM')
								await wait(1000)

								if (!lambda?.killed) { // force kill
									lambda.kill('SIGKILL')
									await wait(1000)
								}
							}

							lambda = null
						} catch (e) {
							logger.warn('Error stopping lambda:', e)
						}
					}

					const startLambda = async () => {
						await stopLambda()

						lambda = spawn(
							'sam',
							[
								'local', 'start-api',
								'--warm-containers', 'LAZY',
								'--debug', '--template-file', join(__dirname, 'template-dev.yaml'),
								'--port', args.port,
							],
							{
								stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
								// stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
								shell: process.platform == 'win32',
								env: {...process.env, DOCKER_HOST: getDockerHost()},
							}
						).on('exit', code => {
							logger.step(`Lambda process exited with code ${code ?? 0}`)
							if (code != 0 && code != null)
								logger.error('Lambda process crashed, waiting for restart...')

							lambda = null
						})
						.on('message', msg => {
							if (process.send) process.send(msg)
						}).on('disconnect', () => {
							if (process.disconnect) process.disconnect()
						}).on('error', e => {
							logger.error('Lambda process error:', e)
							lambda = null
						})

						await wait(2000)

						logger.step('Lambda process started successfully')
					}

					await buildLambda()
					logger.step(`API running on http://${host}:${port}`)

					watch(async () => {
						await buildLambda()
					})

					shutdown(async () => {
						await stopLambda()
					})
				})
			case 'cf':
				return withPort(desiredPort, async (port) => {
					let isBuilding = false

					const buildWorker = async () => {
						if (isBuilding) return
						isBuilding = true
						logger.step('Building worker')
						try {
							await build(platform)
							await startWorker()
						} catch (e) {
							logger.error('Build failed:', e)
							process.exit(0)
						} finally {
							isBuilding = false
						}
					}

					let worker: Miniflare | null = null
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
				return withPort(desiredPort, async (port) => {
					logger.step(`API running on http://${host}:${port}`)

					spawn(
						process.execPath,
						[
							join(__dirname, 'node_modules/.bin/tsx'), 'watch', join(__dirname, 'node_modules/rajt/src/dev.ts'),
						],
						{
							stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
							env: {...process.env, PORT: args.port},
						}
					).on('exit', code => process.exit(code ?? 0))
					.on('message', msg => {
						if (process.send) process.send(msg)
					}).on('disconnect', () => {
						if (process.disconnect) process.disconnect()
					})
				})
			default:
				return logger.warn(
					`🟠 Provide a valid platform: ${['aws', 'cf', 'node'].map(p => colors.blue(p)).join(', ')}.\n`
				)
    }
	},
})

function withPort(desiredPort: number, cb: (port: number) => void) {
	getAvailablePort(desiredPort)
		.then((port: number) => {
			if (port != desiredPort)
				logger.warn(`Port ${desiredPort} was in use, using ${port} as a fallback`)

			cb(port)
		}).catch(e => logger.error('Error finding available port:', e))
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
			pollInterval: 100,
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

async function wait(ms: number) {
	return new Promise(r => setTimeout(r, ms))
}

function getDockerHost() {
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
