import chalk from 'chalk'
import yargs from 'yargs'
import type { CommonYargsArgv, SubHelp } from './types'
import { demandSingleValue } from './helpers'
import rajtBanner from './banner'

import { version as rajtVersion } from '../../package.json'
import { createRegisterYargsCommand } from './core/register-yargs-command'
import { CommandRegistry } from './core/command-registry'

import devCommand from './commands/dev'

export function createCLIParser(argv: string[]) {
	const globalFlags = {
		v: {
			describe: 'Show version number',
			alias: 'version',
      type: 'boolean',
      hidden: true,
    },
		p: {
			describe: 'Define environment platform: aws, cf, node',
      alias: 'platform',
			type: 'string',
			requiresArg: true,
    },
  } as const

	// Type check result against CommonYargsOptions to make sure we've included
	// all common options
	const rajt: CommonYargsArgv = yargs(argv)
		.strict()
		// We handle errors ourselves in a try-catch around `yargs.parse`.
		// If you want the "help info" to be displayed then throw an instance of `CommandLineArgsError`.
		// Otherwise we just log the error that was thrown without any "help info".
		.showHelpOnFail(false)
		.fail((msg, error) => {
			if (!error || error.name === "YError") {
				// If there is no error or the error is a "YError", then this came from yargs own validation
				// Wrap it in a `CommandLineArgsError` so that we can handle it appropriately further up.
				// error = new CommandLineArgsError(msg, {
				// 	telemetryMessage: "yargs validation error",
				// });
				// return
			}
			throw error
		})
		.scriptName(`rajt`)
		.wrap(null)
		.locale('en_US')
		// Define global options here, so they get included in the `Argv` type of
		// the `rajt` variable
		.version(false)
		.options(globalFlags)
		.check(demandSingleValue('p'))
		.middleware((_argv) => {
			if (_argv.cwd) process.chdir(_argv.cwd)
		})
		// .check(
		// 	demandSingleValue(
		// 		'config',
		// 		(configArgv) =>
		// 			configArgv["_"][0] === "dev" ||
		// 			configArgv["_"][0] === "types" ||
		// 			(configArgv["_"][0] === "pages" && configArgv["_"][1] === "dev")
		// 	)
		// )
		// .check(demandSingleValue("env"))
		.epilogue(
			`Please report any issues to ${chalk.hex('#3B818D')(
				'https://github.com/attla/rajt/issues/new/choose'
			)}`
		)

	rajt.updateStrings({
		"Commands:": `${chalk.bold("COMMANDS")}`,
		"Options:": `${chalk.bold("OPTIONS")}`,
		"Positionals:": `${chalk.bold("POSITIONALS")}`,
		"Examples:": `${chalk.bold("EXAMPLES")}`,
  })

	rajt.group(
		// ["config", "cwd", "env", "env-file", "help", "version"],
		["platform", "help"],
		`${chalk.bold("GLOBAL FLAGS")}`
  )

	rajt.help('help', 'Show help').alias('h', 'help')

	// Default help command that supports the subcommands
	const subHelp: SubHelp = {
		command: ["*"],
		handler: async args => setImmediate(() => rajt.parse([...args._.map((a) => `${a}`), "--help"])),
	}
	rajt.command(
		['*'],
		false,
		() => {},
		async args => {
			if (args._.length > 0) {
				throw new Error(`Unknown command: ${args._}.`);
			} else {
				// args.v will exist and be true in the case that no command is called, and the -v
				// option is present. This is to allow for running asynchronous in the version command
        if (args.v) {
          process.stdout.isTTY ? await rajtBanner() : logger.log(rajtVersion)
				} else {
					rajt.showHelp('log')
				}
			}
		}
	)

	const registerCommand = createRegisterYargsCommand(rajt, subHelp)
	const registry = new CommandRegistry(registerCommand)

	/*
	 * You will note that we use the form for all commands where we use the builder function
	 * to define options and subcommands.
	 * Further we return the result of this builder even though it's not completely necessary.
	 * The reason is that it's required for type inference of the args in the handle function.
	 * I wish we could enforce this pattern, but this comment will have to do for now.
	 * (It's also annoying that choices[] doesn't get inferred as an enum. 🤷‍♂.)
	 */
	/*
	 * TODO: Implement proper command grouping if yargs will ever support it
	 * (see https://github.com/yargs/yargs/issues/684)
	 * Until then, use a new line in the command description whenever we want
	 * to create some logical spacing between commands. This is hacky but
	 * ¯\_(ツ)_/¯
	 */

	/******************************************************/
	/*                   RAJT COMMANDS                    */
	/******************************************************/

	registry.define([
		{
			command: 'rajt dev',
			definition: devCommand,
		},
	])
	registry.registerNamespace('dev')

	// registry.define([
	// 	{
	// 		command: "rajt deploy",
	// 		definition: deployCommand,
	// 	},
	// ]);
	// registry.registerNamespace("deploy");

	// registry.define([
	// 	{
	// 		command: "rajt build",
	// 		definition: buildCommand,
	// 	},
	// ]);
	// registry.registerNamespace("build")

	// This set to false to allow overwrite of default behaviour
	rajt.version(false)
	registry.registerAll()
	rajt.exitProcess(false)

	return { rajt, registry, globalFlags }
}

export default async function main(argv: string[]): Promise<void> {
  const { rajt } = createCLIParser(argv)

	try {
		await rajt.parse()
	} catch (e) {
		// const errorType = await handleError(e, rajt.arguments, argv)
		// const durationMs = Date.now() - startTime
		throw e
	} finally {
    // In the bootstrapper script `bin/rajt.js`, we open an IPC channel,
    // so IPC messages from this process are propagated through the
    // bootstrapper. Normally, Node's SIGINT handler would close this for us,
    // but interactive dev mode enables raw mode on stdin which disables the
    // built-in handler. Make sure this channel is closed once it's no longer
    // needed, so we can cleanly exit. Note, we don't want to disconnect if
    // this file was imported in Vitest, as that would stop communication with
		// the test runner.
    if (typeof vitest === 'undefined')
      process.disconnect?.()
	}
}
