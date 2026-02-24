import { mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'pathe'

export default function ensureDirectoryExists(filePath: string) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}
