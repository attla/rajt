import { blue, bold, gray, green, magenta, red, yellow, white } from './colors'

const _step = (color: Function, ...msg: any[]) => {
  const length = msg.length
  if (!length) return
  if (length < 2)
    return console.log(color('⁕') +' '+ msg[0])

  const total = length - 1
  for (let i: number = 0; i < length; i++) {
    switch (i) {
      case 0:
        console.log(color('⁕') + ' ' + msg[i])
        continue
      case total:
        console.log(`   ${gray('⁕')} ${msg[i]}\t`)
        continue
      default:
        console.log(`   ${gray('⁕')} ` + msg[i])
        continue
    }
  }
}

export const step = (...msg: any[]) => _step(blue, ...msg)
export const stepWarn = (...msg: any[]) => _step(yellow, ...msg)

export const substep = (...msg: any[]) => {
  const length = msg.length
  for (let i: number = 0; i < length; i++)
    console.log(`   ${gray('⁕')} ` + msg[i])
}

export const ln = () => console.log('\n')
export const rn = () => console.log('\t')

export const logo = gray(bold('λ'))
export const prefixes = {
  wait: white(bold('○')),
  error: red(bold('⨯')),
  warn: yellow(bold('⚠')),
  ready: logo,
  info: white(bold(' ')),
  event: green(bold('✓')),
  trace: magenta(bold('»')),
} as const

const LOGGING_METHOD = {
  log: 'log',
  warn: 'warn',
  error: 'error',
} as const

function prefixedLog(prefixType: keyof typeof prefixes, ...msg: any[]) {
  const length = msg.length
  if ((msg[0] === '' || msg[0] === undefined) && length == 1)
    msg.shift()

  const consoleMethod: keyof typeof LOGGING_METHOD =
    prefixType in LOGGING_METHOD
      ? LOGGING_METHOD[prefixType as keyof typeof LOGGING_METHOD]
      : 'log'

  const prefix = prefixes[prefixType]
  // If there's no message, don't print the prefix but a new line
  if (length == 0) {
    console[consoleMethod]('')
  } else {
    // Ensure if there's ANSI escape codes it's concatenated into one string.
    // Chrome DevTool can only handle color if it's in one string.
    if (length == 1 && typeof msg[0] == 'string') {
      console[consoleMethod](prefix +' '+ msg[0])
    } else {
      console[consoleMethod](prefix, ...msg)
    }
  }
}

export function wait(...msg: any[]) {
  prefixedLog('wait', ...msg)
}

export function error(...msg: any[]) {
  prefixedLog('error', ...msg)
}

export function warn(...msg: any[]) {
  prefixedLog('warn', ...msg)
}

export function ready(...msg: any[]) {
  prefixedLog('ready', ...msg)
}

export function info(...msg: any[]) {
  prefixedLog('info', ...msg)
}

export function event(...msg: any[]) {
  prefixedLog('event', ...msg)
}

export function trace(...msg: any[]) {
  prefixedLog('trace', ...msg)
}
