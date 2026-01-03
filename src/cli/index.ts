import logger, { type ILogger } from '../utils/logger'

// Prevent non-internal logs
(globalThis as any).logger = logger // Make it global in Node.js and browser
declare global { var logger: ILogger }

// console.log = () => {}
console.info = () => {}
console.warn = () => {}
console.error = () => {}

import process from 'node:process'
import { hideBin } from 'yargs/helpers'

import main from './main'

/**
 * The main entrypoint for the CLI.
 * main only gets called when the script is run directly, not when it's imported as a module.
 */
const directly = () => {
	try {
		return typeof vitest == 'undefined'
			&& (
				![typeof require, typeof module].includes('undefined') && require.main == module
				|| import.meta.url == `file://${process.argv[1]}`
			)
	} catch {
		return false
	}
}

if (directly()) {
	main(hideBin(process.argv))
		.catch(e => {
		// The logging of any error that was thrown from `main()` is handled in the `yargs.fail()` handler.
		// Here we just want to ensure that the process exits with a non-zero code.
		// We don't want to do this inside the `main()` function, since that would kill the process when running our tests.
		process.exit(e?.code || 1)
	})
}
