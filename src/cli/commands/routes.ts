import { join } from 'pathe'
import { defineCommand } from 'citty'
import { inspectRoutes } from 'hono/dev'
import { IMPORT } from 't0n'
import { _rajt } from '../../utils/paths'
import { rn } from '../../utils/log'
import { highlightedURI, highlightedMethod } from '../utils'

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
		const mod = await IMPORT(join(_rajt, 'dev.ts'))
		const app = mod.default

		const opts = {
			path: args?.path || '',
			method: args?.method?.toUpperCase() || '',
			reverse: !!args?.reverse,
		}

		const keys: Set<string> = new Set()
		let maxMethodLength = 0
		let maxPathLength = 0

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
			let str = highlightedMethod(method, null, true)

			if (method == 'GET')
				mLength += 5

			console.log(str + ' '.repeat(maxMethodLength - mLength) +'  '+ highlightedURI(path, method))
		})

		rn()
	},
})
