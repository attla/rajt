import chalk from 'chalk'
// import { dedent } from '../helpers'
import rajtBanner from '../banner'
import { demandSingleValue } from '../helpers'
import type { PositionalOptions } from 'yargs'
import type {
  CommandDefinition,
  CommonYargsArgv,
	HandlerArgs,
	InternalDefinition,
  NamedArgDefinitions,
  SubHelp,
} from '../types'

// Creates a function for registering commands using Yargs
export function createRegisterYargsCommand(
	yargs: CommonYargsArgv,
	subHelp: SubHelp
) {
	return function registerCommand(
		segment: string,
		def: InternalDefinition,
		registerSubTreeCallback: () => void
	): void {
		yargs.command(
			segment,
			(def.metadata?.hidden ? false : def.metadata?.description) as string, // Cast to satisfy TypeScript overload selection
			(subYargs) => {
				if (def.type === "command") {
					const args = def.args ?? {}

					const positionalArgs = new Set(def.positionalArgs)

					const nonPositional = Object.fromEntries(
						Object.entries(args)
							.filter(([key]) => !positionalArgs.has(key))
							.map(([name, opts]) => [
								name,
								{
									...opts,
									group: "group" in opts ? chalk.bold(opts.group) : undefined,
								},
							])
					)

					subYargs
						.options(nonPositional)
						.epilogue(def.metadata?.epilogue ?? "")
						.example(
							def.metadata.examples?.map((ex) => [
								ex.command,
								ex.description,
							]) ?? []
						)

					for (const hide of def.metadata.hideGlobalFlags ?? []) {
						subYargs.hide(hide)
					}

					// Ensure non-array arguments receive a single value
					for (const [key, opt] of Object.entries(args)) {
						if (!opt.array && opt.type !== "array")
							subYargs.check(demandSingleValue(key))
					}

					// Register positional arguments
					for (const key of def.positionalArgs ?? []) {
						subYargs.positional(key, args[key] as PositionalOptions)
					}
				} else if (def.type === "namespace") {
					for (const hide of def.metadata.hideGlobalFlags ?? [])
						subYargs.hide(hide)

					// Hacky way to print --help for incomplete commands
					// e.g. `rajt migrate local` runs `rajt migrate local --help`
					subYargs.command(subHelp)
				}

				// Register subtree
				registerSubTreeCallback()
			},
			// Only attach the handler for commands, not namespaces
			def.type === "command" ? createHandler(def, def.command) : undefined
		)
	}
}

function createHandler(def: CommandDefinition, commandName: string) {
	return async function handler(args: HandlerArgs<NamedArgDefinitions>) {
		try {
			const shouldPrintBanner = def.behaviour?.printBanner

			if (
				/* No default behaviour override: show the banner */
				shouldPrintBanner === undefined ||
				/* Explicit opt in: show the banner */
				(typeof shouldPrintBanner === "boolean" &&
					shouldPrintBanner !== false) ||
				/* Hook resolves to true */
				(typeof shouldPrintBanner === "function" &&
					shouldPrintBanner(args) === true)
			) {
				await rajtBanner()
      }

      if (def.metadata.deprecated)
        console.warn(def.metadata.deprecatedMessage)

      if (def.metadata.statusMessage)
        console.warn(def.metadata.statusMessage)

      await def.validateArgs?.(args)

      def.handler(args, {
        ab:'cd',
      })
		} catch (err) {
			// Write handler failure to output file if one exists
			// if (err instanceof Error) {
			// 	const code = "code" in err ? (err.code as number) : undefined
			// 	const message = "message" in err ? (err.message as string) : undefined
			// 	writeOutput({
			// 		type: "command-failed",
			// 		version: 1,
			// 		code,
			// 		message,
			// 	})
			// }
			throw err
		}
	}
}
