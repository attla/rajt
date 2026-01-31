
import { join } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'

import { defineCommand } from 'citty'
import type { Miniflare } from 'miniflare'
import { _root, build, wait, watch, normalizePlatform, platformError, getRuntime, createMiniflare, getDockerHost } from './utils'
import { step, error, event, warn } from '../../utils/log'
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
		switch (platform) {
			case 'aws':
				return withPort(desiredPort, async (port) => {
					let isBuilding = false
					let lambda: ChildProcess | null = null

					const buildLambda = async () => {
						if (isBuilding) return
						isBuilding = true
						step('Building lambda')
						try {
							await build(platform)
							if (!lambda) await startLambda()
						} catch (e) {
							error('Build failed:', e)
							process.exit(0)
						} finally {
							isBuilding = false
						}
					}

					const stopLambda = async () => {
						if (!lambda) return
						step('Stopping lambda process...')
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
							warn('Error stopping lambda:', e)
						}
					}

					const startLambda = async () => {
						await stopLambda()

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
						).on('exit', code => {
							step(`Lambda process exited with code ${code ?? 0}`)
							if (code != 0 && code != null)
								error('Lambda process crashed, waiting for restart...')

							lambda = null
						})
						.on('message', msg => {
							if (process.send) process.send(msg)
						}).on('disconnect', () => {
							if (process.disconnect) process.disconnect()
						}).on('error', e => {
							error('Lambda process error:', e)
							lambda = null
						})

						await wait(2000)

						step('Lambda process started successfully')
					}

					await buildLambda()
					event(`API running on http://${host}:${port}`)

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
						step('Building worker')
						try {
							await build(platform)
							await startWorker()
						} catch (e) {
							error('Build failed:', e)
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
					event(`API running on http://${host}:${port}`)

					watch(async () => {
						step('Restarting server')
						await buildWorker()
						step('Server restarted')
					})
				})
			default:
			case 'node':
				return withPort(desiredPort, async (port) => {
					const isBun = getRuntime() == 'bun'
					const params = isBun
						? ['run', '--port='+ port, '--hot', '--silent', '--no-clear-screen', '--no-summary', join(_root, 'node_modules/rajt/src/dev.ts')]
						: [join(_root, 'node_modules/.bin/tsx'), 'watch', join(_root, 'node_modules/rajt/src/dev-node.ts')]

					const child = spawn(
						process.execPath,
						params,
						{
							stdio: ['inherit', isBun ? 'pipe' : 'inherit', 'inherit', 'ipc'],
							env: {...process.env, PORT: port},
						}
					)

					event(`API running on http://${host}:${port}`)

					if (isBun && child?.stdout) {
						child.stdout?.on('data', data => {
							const output = data.toString()
							if (!output.includes('Started development server'))
									process.stdout.write(output)
						})
					}

					child.on('exit', code => process.exit(code ?? 0))
						.on('message', msg => {
							if (process.send) process.send(msg)
						}).on('disconnect', () => {
							if (process.disconnect) process.disconnect()
						})
				})
    }
	},
})
