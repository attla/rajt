import { join } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

import { defineCommand } from 'citty'
import type { Miniflare } from 'miniflare'
import {
	_root, build, wait, watch, normalizePlatform, platformError, getRuntime,
	wranglerConfig, createMiniflare, localflareManifest,
	getDockerHost
} from '../utils'
import { error, event, log, rn, warn } from '../../utils/log'
import { withPort } from '../../utils/port'
import shutdown from '../../utils/shutdown'

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
			// required: true,
		},
	},
	async run({ args }) { // @ts-ignore
		const platform = normalizePlatform(args.p || args.platform || args._[0] || 'node')
		if (!platform)
			return platformError()

		const desiredPort = args.port ? Number(args.port) : 3000
		const host = args.host ? String(args.host) : 'localhost'

		let isBuilding = false
		const startApp = async (start: Function, stop: Function|undefined = undefined, building: boolean = true) => {
			if (building) {
				if (isBuilding) return
				isBuilding = true
				event('Building..')
			}
			const fn = async () => {
				building && await build(platform)
				await start()
			}

			try {
				await fn()
				watch(async () => {
					event('Restarting..')
					await fn()
					// event('Restarted...')
				})
				// @ts-ignore
				stop && shutdown(stop)
			} catch (e: any) {
				error(e)
				process.exit(0)
			} finally {
				isBuilding = false
			}
		}

		const applyExit = async (app: ChildProcess | null) => {
			if (!app) return null

			app //?.on('exit', code => process.exit(code ?? 0))
				.on('message', msg => {
					process.send && process.send(msg)
				}).on('disconnect', () => {
					process.disconnect && process.disconnect()
				})
		}
		const killProcess = async (app: ChildProcess | null) => {
			if (!app) return null
			// event('Stopping..')
			try {
				if (!app?.killed) {
					app.kill('SIGTERM')
					await wait(1000)

					if (!app?.killed) { // force kill
						app.kill('SIGKILL')
						await wait(1000)
					}
				}

				return null
			} catch (e) {
				error('Error stopping:', e)
			}

			return null
		}

		const started = (port: number) => {
			log(`Starting API on http://${host}:${port}`)
			if (platform == 'cf')
				log(`Localflare on https://studio.localflare.dev`)
			rn()
		}

		switch (platform) {
			case 'aws':
				return withPort(desiredPort, async (port) => {
					started(port)
					let lambda: ChildProcess | null = null
					const stopLambda = async () => {
						lambda = await killProcess(lambda)
					}
					const startLambda = async () => {
						if (lambda) await stopLambda()

						lambda = spawn(
							'sam',
							[
								'local', 'start-api',
								'--warm-containers', 'LAZY',
								'--debug', '--template-file', join(_root, 'template-dev.yaml'),
								'--port', String(port),
							],
							{
								stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
								// stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
								shell: process.platform == 'win32',
								env: {...process.env, DOCKER_HOST: getDockerHost()},
							}
						)
						//.on('exit', code => {
						// 	warn(`Lambda process exited with code ${code ?? 0}`)
						// 	if (code != 0 && code != null)
						// 		error('Lambda process crashed, waiting for restart...')

						// 	lambda = null
						// }).on('message', msg => {
						// 	process.send && process.send(msg)
						// }).on('disconnect', () => {
						// 	process.disconnect && process.disconnect()
						// }).on('error', e => {
						// 	error('Lambda process error:', e)
						// 	lambda = null
						// })
						applyExit(lambda)
						await wait(2000)
					}

					await startApp(startLambda, stopLambda)
				})
			case 'cf':
				return withPort(desiredPort, async (port) => {
					started(port)
					let worker: Miniflare | null = null
					let localflare: Miniflare | null = null
					const startWorker = async () => {
						if (worker) await worker.dispose()
						if (localflare) await localflare.dispose()

						const workerConfig = await wranglerConfig()
						workerConfig.host = host
						workerConfig.liveReload = false

						worker = createMiniflare({ ...workerConfig, port })
						await worker.ready
						localflare = createMiniflare({
							...workerConfig,
							vars: {
								...workerConfig.vars,
								LOCALFLARE_MANIFEST: JSON.stringify(localflareManifest(workerConfig)),
							},
							main: 'node_modules/localflare-api/dist/worker/index.js',
							port: 8788,
							inspectorPort: 9230,
						})
						await localflare.ready
					}

					await startApp(startWorker)
				})
			default:
			case 'node':
				return withPort(desiredPort, async (port) => {
					started(port)
					const isBun = getRuntime() == 'bun'
					const params = isBun
						? ['run', '--port='+ port, '--hot', '--silent', '--no-clear-screen', '--no-summary', join(_root, 'node_modules/rajt/src/dev.ts')]
						: [join(_root, 'node_modules/.bin/tsx'), 'watch', join(_root, 'node_modules/rajt/src/dev-node.ts')]


					let nodeApp: ChildProcess | null = null
					const stopNode = async () => {
						nodeApp = await killProcess(nodeApp)
					}

					const startNode = async () => {
						if (nodeApp) await stopNode()

						nodeApp = spawn(
							process.execPath,
							params,
							{
								stdio: ['inherit', isBun ? 'pipe' : 'inherit', 'inherit', 'ipc'],
								env: {...process.env, PORT: port},
							}
						)

						if (isBun && nodeApp?.stdout) {
							nodeApp.stdout?.on('data', data => {
								const output = data.toString()
								if (!output.includes('Started development server'))
										process.stdout.write(output)
							})
						}

						applyExit(nodeApp)
					}

					await startApp(startNode, stopNode, false)
				})
    }
	},
})
