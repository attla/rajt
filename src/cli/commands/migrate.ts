import { defineCommand } from 'citty'
import { spawn } from 'node:child_process'
import { Migrator } from 'forj'
import { gray } from '../../utils/colors'
import { _root, getRuntime } from './utils'
import { wait, info, event, rn, error, log } from '../../utils/log'

export default defineCommand({
	meta: {
		name: 'migrate',
		description: '🗃️ Migration performs\n',
	},
	args: {
		remote: {
			description: 'Execute against remote environment',
			type: 'boolean',
		},
	},
	async run({ args }) {
		if (args._.length != 2) {
			error('Invalid args: '+ gray('[ACTION] [DATABASE]'))
			return rn()
		}

		const [action, database] = args._
		const isBun = getRuntime() == 'bun'
		const isRemote = !!args?.remote

		try {
			const migrations = await Migrator.queue()
			const pending = migrations.pending
			const migrated = migrations.migrated

			switch (action) {
				case 'migrate':
				case 'apply':
					if (!pending?.length)
						log('Nothing to compile')
					wait('Running migrations')

					await Migrator.compile([...migrated, ...pending])

					const child = spawn(
						isBun ? 'bunx' : 'npx',
						['wrangler', 'd1', 'migrations', 'apply', database, isRemote ? '--remove' : '--local'],
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

					pending.forEach(item => event(item.name))
					break
				case 'status':
					if (migrated?.length) {
						event('Migrated')
						migrated.forEach(item => info(item.name))
					}

					if (pending?.length) {
						wait('Pending')
						pending.forEach(item => info(item.name))
					}

					break
				default:
					return error('Invalid action')
			}

		} finally {
			rn()
		}
	},
})
