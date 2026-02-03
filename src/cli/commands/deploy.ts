import { spawn } from 'node:child_process'
import { defineCommand } from 'citty'

import { _root, normalizePlatform, platformError, getRuntime } from './utils'
import { error } from '../../utils/log'
import { platforms } from './constants'

import build from './build'

export default defineCommand({
	meta: {
		name: 'deploy',
		description: '☁️  Perform the build and execute deploy\n',
	},
	args: {
		platform: {
			alias: 'p',
			description: 'Environment platform',
			type: 'enum',
			options: platforms,
		},
	},
	async run({ args }) { // @ts-ignore
		const platform = normalizePlatform(args.p || args.platform || args._[0])
		if (!platform)
			return platformError()

		// @ts-ignore
		await build.run({ args: { platform } })
		const isBun = getRuntime() == 'bun'

		switch (platform) {
			case 'aws':
				// TODO: perform aws deploy
				return error('Platform not yet implemented, contact the webmaster')
			case 'cf':
				const child = spawn(
					isBun ? 'bunx' : 'npx',
					['wrangler', 'deploy'],
					{
						stdio: 'inherit',
						cwd: _root,
					}
				)

				child.on('exit', code => process.exit(code ?? 0))
					.on('message', msg => {
						process.send && process.send(msg)
					}).on('disconnect', () => {
						process.disconnect && process.disconnect()
					})

				return
			case 'vercel':
				return error('Platform not yet implemented, contact the webmaster')
				const vchild = spawn(
					isBun ? 'bunx' : 'npx',
					['vercel', 'deploy'],
					{
						stdio: 'inherit',
						cwd: _root,
					}
				)

				vchild.on('exit', code => process.exit(code ?? 0))
					.on('message', msg => {
						process.send && process.send(msg)
					}).on('disconnect', () => {
						process.disconnect && process.disconnect()
					})

				return
    }
	},
})
