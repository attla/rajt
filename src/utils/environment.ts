export default function getEnvironment() {
  if (process.env?.npm_lifecycle_event === 'dev')
    return 'dev'

  if (
    process.argv?.includes('--dev')
    || process.execArgv?.includes('--watch')
    || import.meta.url?.includes('localhost')
  )
    return 'dev'

  // @ts-ignore
  if (typeof Bun === 'undefined') return 'prod'

  // @ts-ignore
  if (Bun.argv.includes('--prod')) return 'prod'
  // @ts-ignore
  if (Bun.argv.includes('--dev') || Bun.main.endsWith('.ts')) return 'dev'


  return 'prod'
}
