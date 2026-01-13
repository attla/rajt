import colors from 'picocolors'

const _console = { ...console }

export interface ILogger {
  write(...data: Array<string | ArrayBufferView | ArrayBuffer>): number;
  error(...data: any[]): void;
  info(...data: any[]): void;
  log(...data: any[]): void;
  // TODO: table(tabularData?: any, properties?: string[]): void;
  trace(...data: any[]): void;
  warn(...data: any[]): void;
  // custom
  step(...data: any[]): void;
  substep(...data: any[]): void;
  ln(): void;
}

export const logger = {
	step(...args: any[]) {
		if (args?.length && args.length < 2) return _console.log(colors.blue('⁕') +` ${args[0]}\n`)
		const length = args.length - 1
		args.forEach((arg, index) => {
				switch (index) {
					case 0:
						return _console.log(colors.blue('⁕') + ' ' + arg)
						// return _console.log(colors.blue('⁕') +` ${arg} \n`)
					case length:
						return _console.log(`   ${colors.gray('⁕')} ${arg}\n`)
					default:
						return _console.log(`   ${colors.gray('⁕')} ` + arg)
				}
    })
	},
	substep(...args: any[]) {
		args.forEach(arg => _console.log(`   ${colors.gray('⁕')} ` + arg))
	},
	ln() {
		_console.log('\n')
	},
  log(...args: any[]) {
    _console.log(...args)
  },
  info(...args: any[]) {
    _console.info(...args)
  },
  warn(...args: any[]) {
    _console.warn(...args)
  },
  error(...args: any[]) {
    _console.error(...args)
  },
  trace(...args: any[]) {
    _console.trace(...args)
  },
  write(...args: any[]) {
    _console.write(...args)
  },
}

export default logger
