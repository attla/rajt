import chalk from 'chalk'
import semiver from 'semiver'
// import stripAnsi from 'strip-ansi'
// import supportsColor from 'supports-color'
import { version as rajtVersion } from '../../package.json'
import { updateCheck } from './update-check'

const MIN_NODE_VERSION = '20.0.0'

// The PRERELEASE_LABEL is provided at esbuild time as a `define` for beta releases.
// Otherwise it is left undefined, which signals that this isn't a prerelease
declare const PRERELEASE_LABEL: string

export default async function printBanner(performUpdateCheck = true) {
	let text =
		typeof PRERELEASE_LABEL === 'undefined'
			? `λ Rajt ${chalk.gray('v'+rajtVersion)}`
			: `λ Rajt ${chalk.gray('v'+rajtVersion)} (${chalk.blue(PRERELEASE_LABEL)})`
	let maybeNewVersion: string | undefined;
	if (performUpdateCheck) {
		maybeNewVersion = await updateCheck()
		if (maybeNewVersion !== undefined)
			text += ` (update available ${chalk.green(maybeNewVersion)})`
	}

	logger.log(`\n${text}\n`
		// + (supportsColor.stdout
		// 		? chalk.white('─'.repeat(stripAnsi(text).length))
		// 		: '─'.repeat(text.length))
	)

	if (semiver(process.versions.node, MIN_NODE_VERSION) < 0) {
		console.warn(
			`Rajt requires at least Node.js v${MIN_NODE_VERSION}. You are using v${process.versions.node}. Please update your version of Node.js.`
		)
	}

	// Log a slightly more noticeable message if this is a major bump
	if (maybeNewVersion !== undefined) {
		const currentMajor = parseInt(rajtVersion.split('.')[0]);
		const newMajor = parseInt(maybeNewVersion.split('.')[0]);
		if (newMajor > currentMajor) {
			console.warn(
				`The version of Rajt you are using is now out-of-date.
Please update to the latest version to prevent critical errors.
Run \`npm install --save-dev rajt@${newMajor}\` to update to the latest version.
After installation, run Rajt with \`npx rajt\`.`
			)
		}
	}
}
