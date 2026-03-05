import { dirname, join } from 'pathe'
import { Envir } from 't0n'

export const _rajt = join(dirname(new URL(import.meta.url).pathname), '..')
export const _root = Envir.get('npm_config_local_prefix') || Envir.get('PWD') || join(_rajt, '../../../')
