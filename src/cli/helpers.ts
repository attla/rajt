import type {
	AliasDefinition,
  CommandDefinition,
  CreateCommandResult,
	NamedArgDefinitions,
	NamespaceDefinition,
} from './types'
import assert from 'node:assert'

/**
 * A helper to demand one of a set of options
 * via https://github.com/yargs/yargs/issues/1093#issuecomment-491299261
 */
export function demandOneOfOption(...options: string[]) {
	return function (argv: { [key: string]: unknown }) {
		const count = options.filter((option) => argv[option]).length
		const lastOption = options.pop()

		if (count === 0) {
			throw new Error(
				`Exactly one of the arguments ${options.join(
					", "
				)} and ${lastOption} is required`
			)
		} else if (count > 1) {
			throw new Error(
				`Arguments ${options.join(
					", "
				)} and ${lastOption} are mutually exclusive`
			)
		}

		return true
	}
}

/**
 * A helper to ensure that an argument only receives a single value.
 *
 * This is a workaround for a limitation in yargs where non-array arguments can still receive multiple values
 * even though the inferred type is not an array.
 *
 * @see https://github.com/yargs/yargs/issues/1318
 */
export function demandSingleValue<Argv extends { [key: string]: unknown }>(
	key: string,
	allow?: (argv: Argv) => boolean
) {
	return function (argv: Argv) {
		if (Array.isArray(argv[key]) && !allow?.(argv))
      throw new Error(
        `The argument "--${key}" expects a single value, but received multiple: ${JSON.stringify(argv[key])}.`
      )

		return true
	}
}

export function isAliasDefinition(
	def:
		| AliasDefinition
		| CreateCommandResult<NamedArgDefinitions>
		| NamespaceDefinition
): def is AliasDefinition {
	return (def as AliasDefinition).aliasOf !== undefined
}

export function isCommandDefinition(
	def:
		| AliasDefinition
		| CreateCommandResult<NamedArgDefinitions>
		| NamespaceDefinition
): def is CommandDefinition {
	return (def as CommandDefinition).handler !== undefined
}

export function isNamespaceDefinition(
	def:
		| AliasDefinition
		| CreateCommandResult<NamedArgDefinitions>
		| NamespaceDefinition
): def is NamespaceDefinition {
	return !isAliasDefinition(def) && !isCommandDefinition(def)
}

/**
 * Tagged template literal for removing indentation from a block of text.
 *
 * If the first line is empty, it will be ignored.
 */
export function dedent(strings: TemplateStringsArray, ...values: unknown[]) {
	// Convert template literal arguments back to a regular string
	const raw = String.raw({ raw: strings }, ...values)
	// Split the string by lines
	let lines = raw.split("\n")
	assert(lines.length > 0)

	// If the last line is just whitespace, remove it
	if (lines[lines.length - 1].trim() === "")
		lines = lines.slice(0, lines.length - 1)

	// Find the minimum-length indent, excluding the first line
	let minIndent = ""
	// (Could use `minIndent.length` for this, but then would need to start with
	// infinitely long string)
	let minIndentLength = Infinity
	for (const line of lines.slice(1)) {
		const indent = line.match(/^[ \t]*/)?.[0]
		if (indent != null && indent.length < minIndentLength) {
			minIndent = indent
			minIndentLength = indent.length
		}
	}

	// If the first line is just whitespace, remove it
	if (lines.length > 0 && lines[0].trim() === "")
		lines = lines.slice(1)

	// Remove indent from all lines, and return them all joined together
	lines = lines.map(line => line.startsWith(minIndent) ? line.substring(minIndent.length) : line)
	return lines.join("\n")
}
