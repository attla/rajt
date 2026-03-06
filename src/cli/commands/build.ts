import { defineCommand } from 'citty'
import { gray } from 't0n/color'
import { build, normalizePlatform, platformError } from '../utils'
import { wait, error, rn } from '../../utils/log'

import { platforms } from '../constants'

export default defineCommand({
	meta: {
		name: 'build',
		description: '🗂️  Perform the build\n',
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
		const platform = normalizePlatform(args.p || args.platform || args._[0] || 'node')
		if (!platform)
			return platformError()

		wait('Building for platform: '+ gray(platform))

		try {
			await build(platform)
		} catch (e: any) {
			error('Build failed:', e?.message || e)
			process.exit(0)
		} finally {
			rn()
		}
	},
})
