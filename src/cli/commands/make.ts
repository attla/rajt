import { defineCommand } from 'citty'
import { join, relative } from 'node:path'
import { Migrator } from 'forj'
import { _root, makeFile, hasExt, camelCase, kebabCase } from './utils'
import { event, error } from '../../utils/log'

export default defineCommand({
	meta: {
		name: 'make',
		description: '📄 Create new files\n',
	},
	async run({ args }) {
		const action = process.argv.at(args._.length > 1 ? 3 : 2)?.replace('make:', '') || ''
		const name = args._[1] || args._[0] || ''
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
				const className = camelCase(name)
				makeFile(fileName, `import { Action } from 'rajt'
import { IRequest, IResponse } from 'rajt/types'

export default class ${className} extends Action {
	static async handle(req: IRequest, res: IResponse) {
		return res.ok('${className}')
	}
}
`)
				break
			case 'migrate':
			case 'migration':
				fileName = path(Migrator.fileName(name), 'migration')
				if (!fileName.endsWith('.ts')) fileName += '.ts'
				makeFile(fileName, `import { Migration, Schema, Blueprint } from 'rajt/db'

export default class ${Migrator.className(name)} extends Migration {
	static async run() {
		Schema.${name.includes('create') ? 'create' : 'table'}('users', (table: Blueprint) => {
			table.id()
			table.timestamps()
		})
	}
}
`)
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
