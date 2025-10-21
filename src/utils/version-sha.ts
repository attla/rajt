import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export default function getLastCommitHash(path: string = '.git') {
  try {
    const gitDir = join(process.cwd(), path)
    const headPath = join(gitDir, 'HEAD')

    let headContent = readFileSync(headPath, 'utf8').trim()

    if (headContent.startsWith('ref:'))
      headContent = readFileSync(join(gitDir, headContent.substring(5)), 'utf8').trim()

    return headContent
  } catch (e) {
    console.error('Error reading HEAD file: ', e?.message)
    return null
  }
}
