const prd = Symbol('prd')
const dev = Symbol('dev')

// @ts-ignore
let env = process.env.RAJT_ENV || detectEnvironment()

export const getEnv = () => env // @ts-ignore
export const setEnv = (e: symbol) => env = e

export function detectEnvironment(): symbol {
  try {
    if (
      process.env?.npm_lifecycle_event === 'dev'
      || process.env?.npm_lifecycle_script?.startsWith('rajt')
      || process.env?.AWS_SAM_LOCAL
      // || process?.argv?.includes('--dev')
      || process?.argv?.some(arg => ['-port', '-platform', '--dev', '--development', '--watch'].includes(arg))
      || process?.execArgv?.includes('--watch')
      || import.meta.url?.includes('localhost')
    ) {
      return dev
    }
  } catch (e) {}

  return prd
}

export const isEnv = (e: symbol) => env === e

// @ts-ignore
export const isDev = () => env === dev
export const isProd = () => env === prd

export const isDevelopment = isDev
export const isProduction = isProd
export const isPrd = isProd
