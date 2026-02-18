export const replace = (str: string, map: Record<string, string>) => {
  if (!str || typeof str != 'string' || !map || typeof map != 'object') return str
  const entries = Object.entries(map)
  const length = entries?.length || 0
  if (!length) return str

  str = str.trimStart()
  if (length == 1)
    return str.replaceAll(entries[0][0], entries[0][1])

  return entries.reduce(
    (acc, entry) => acc.replace(new RegExp(entry[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), entry[1]),
    str
  )
}

export const route = `
import { Action } from 'rajt'
import { IRequest, IResponse } from 'rajt/types'

export default class R_NAME extends Action {
	static async handle(req: IRequest, res: IResponse) {
		return res.ok('R_NAME')
	}
}
`

export const migration = `
import { Migration, Schema, Blueprint } from 'rajt/db'

export default class M_NAME extends Migration {
  static async run() {
    Schema.S_NAME('T_NAME', (table: Blueprint) => {
      M_CONTENT
    })
  }
}
`
export const migrationCreate = `
      table.id()
      table.timestamps()
`.trim()
