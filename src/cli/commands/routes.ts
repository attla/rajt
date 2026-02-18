import { join } from 'node:path'
import { defineCommand } from 'citty'
import { inspectRoutes } from 'hono/dev'
import { IMPORT } from 't0n'
import { gray, purple, red, yellow } from '../../utils/colors'
import { __rajt } from '../utils'
import { rn } from '../../utils/log'

export default defineCommand({
	meta: {
		name: 'routes',
		description: '📒 Displays all registered routes\n',
	},
	args: {
		path: {
			description: 'Filter the routes by path',
			type: 'string',
		},
		method: {
			description: 'Filter the routes by method',
			type: 'string',
		},
		reverse: {
			description: 'Reverse the ordering of the routes',
			type: 'boolean',
		},
	},
	async run({ args }) {
		const mod = await IMPORT(join(__rajt, 'dev.ts'))
		const app = mod.default

		const opts = {
			path: args?.path || '',
			method: args?.method?.toUpperCase() || '',
			reverse: !!args?.reverse,
		}

		const keys: Set<string> = new Set()
		let maxMethodLength = 0
		let maxPathLength = 0

		const colorMethod = (method: string, str?: string) => {
			const val = str || method

			switch (method) {
				case 'HEAD':
				case 'OPTIONS':
				case 'CONNECT':
				case 'TRACE':
					return gray(val)
				case 'GET':
					return purple(val)
				case 'POST':
				case 'PUT':
				case 'PATCH':
					return yellow(val)
				case 'DELETE':
					return red(val)
			}

			return val
		}

		let routes = inspectRoutes(app)
			.filter(({ method, path, isMiddleware }) => {
				const key = method + '-' + path
				if (keys.has(key)) return false
				keys.add(key)

				let mLength = method.length
				if (method == 'GET') mLength += 5

				maxMethodLength = Math.max(maxMethodLength, mLength)
				maxPathLength = Math.max(maxPathLength, path.length)

				return [
					isMiddleware && method != 'ALL' || !isMiddleware,
					opts.path ? path.startsWith(opts.path) : true,
					opts.method ? method == opts.method : true,
				].every(Boolean)
			})

		if (opts.reverse)
			routes = routes.reverse()

		routes.forEach(route => {
			if (!route) return
			const { method, path } = route

			let mLength = method.length
			let str = colorMethod(method)

			if (method == 'GET') {
				mLength += 5
				str += gray('|') + colorMethod('HEAD')
			}

			console.log(str + ' '.repeat(maxMethodLength - mLength) +'  '+ path.replace(
				/(?::([a-zA-Z_][a-zA-Z0-9_]*)(\{[^}]+\})?|\*)/g,
				_ => colorMethod(method, _)
			))
		})

		rn()
	},
})
