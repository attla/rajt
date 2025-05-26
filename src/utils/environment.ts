export default function getEnvironment() {
  try {
    if (
      process.env?.npm_lifecycle_event === 'dev'
      || process.env?.AWS_SAM_LOCAL
      || process?.argv?.includes('--dev')
      || process?.execArgv?.includes('--watch')
      || import.meta.url?.includes('localhost')
    ) {
      return 'dev'
    }
  } catch (e) { }

  return 'prod'
}
