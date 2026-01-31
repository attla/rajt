import { platforms } from './constants'

export type ChokidarEventName = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
export type Platform = typeof platforms[number]
