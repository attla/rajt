import { defineCommand } from 'citty'
import { join, relative } from 'node:path'
import { Migrator } from 'forj'
import { _root, makeFile, hasExt, camelCase, kebabCase } from '../utils'
import { event, error } from '../../utils/log'
import * as stub from '../stubs'

export default defineCommand({
	meta: {
		name: 'make',
		description: '📄 Create new files\n',
	},
	async run({ args }) {
		const alias = process.argv[2]?.startsWith('make:')
		const action = alias ? process.argv[2].replace('make:', '') : process.argv[3]
		const name = alias ? args._[0] : args._[1]
		const binding = alias ? args._[1] : args._[2]

		if (!name)
			return error('File name is required')

		const path = (p: string, dir: string = action) => join(_root, dir + 's', p)
		let fileName = ''
		switch (action) {
			case 'config':
				fileName = path(kebabCase(name))
				if (!hasExt(fileName)) fileName += '.ts'
				makeFile(fileName, name.endsWith('.json') ? '{\n}' : 'export default {\n\n}\n')
				break
			case 'enum':
				error('Action not yet implemented, contact the webmaster')
				break
			case 'route':
			case 'action':
			case 'endpoint':
				fileName = path(kebabCase(name))
				if (!fileName.endsWith('.ts')) fileName += '.ts'
				makeFile(fileName, stub.replace(stub.route, { R_NAME: camelCase(name) }))
				break
			case 'migrate':
			case 'migration':
				fileName = Migrator.fileName(name)
				const [table, create] = Migrator.guess(name)
				fileName = path(join(binding || '', fileName), 'migration')
				if (!fileName.endsWith('.ts')) fileName += '.ts'
				makeFile(fileName, stub.replace(stub.migration, {
					M_NAME: Migrator.className(name),
					S_NAME: create ? 'create' : 'table',
					T_NAME: table || 'TABLE_NAME',
					M_CONTENT: create ? stub.migrationCreate : '//',
				}))
				break
			case 'model':
				error('Action not yet implemented, contact the webmaster')
				break
			case 'job':
				error('Action not yet implemented, contact the webmaster')
				break
			case 'seed':
			case 'seeder':
				error('Action not yet implemented, contact the webmaster')
				break
			case 'test':
				error('Action not yet implemented, contact the webmaster')
				break
			default:
				return error('Invalid action')
		}

		event(action.charAt(0).toUpperCase() + action.slice(1) +' "'+ relative(_root, fileName) +'" created successfully')
	},
})
