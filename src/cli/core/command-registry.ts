import assert from 'node:assert'
import chalk from 'chalk'
import {
	isAliasDefinition,
	isCommandDefinition,
	isNamespaceDefinition,
} from '../helpers'
import type {
	AliasDefinition,
	Command,
	CreateCommandResult,
	DefinitionTree,
	DefinitionTreeNode,
	InternalDefinition,
	Metadata,
	NamedArgDefinitions,
	NamespaceDefinition,
	RegisterCommand,
} from '../types'

const BETA_CMD_COLOR = '#BD5B08'

/**
 * Class responsible for registering and managing commands within a command registry.
 */
export class CommandRegistry {
	/**
	 * Root node of the definition tree.
	 */
	#DefinitionTreeRoot: DefinitionTreeNode;

	/**
	 * Set of registered namespaces.
	 */
	#registeredNamespaces: Set<string>;

	/**
	 * Function to register a command.
	 */
	#registerCommand: RegisterCommand;

	/**
	 * The tree structure representing all command definitions.
	 */
	#tree: DefinitionTree;

	/**
	 * Initializes the command registry with the given command registration function.
	 */
	constructor(registerCommand: RegisterCommand) {
		this.#DefinitionTreeRoot = { subtree: new Map() }
		this.#registeredNamespaces = new Set<string>()
		this.#registerCommand = registerCommand
		this.#tree = this.#DefinitionTreeRoot.subtree
	}

	/**
	 * Defines multiple commands and their corresponding definitions.
	 */
	define(
		defs: {
			command: Command;
			definition:
				| AliasDefinition
				| CreateCommandResult<NamedArgDefinitions>
				| NamespaceDefinition;
		}[]
	) {
		for (const def of defs)
			this.#defineOne(def)
	}

	getDefinitionTreeRoot() {
		return this.#DefinitionTreeRoot
	}

	/**
	 * Registers all commands in the command registry, walking through the definition tree.
	 */
	registerAll() {
		for (const [segment, node] of this.#tree.entries()) {
			if (this.#registeredNamespaces.has(segment))
				continue

			this.#registeredNamespaces.add(segment)
			this.#walkTreeAndRegister(segment, node, `rajt ${segment}`)
		}
	}

	/**
	 * Registers a specific namespace if not already registered.
	 * TODO: Remove this once all commands use the command registry.
	 * See https://github.com/cloudflare/workers-sdk/pull/7357#discussion_r1862138470 for more details.
	 */
	registerNamespace(namespace: string) {
		if (this.#registeredNamespaces.has(namespace))
			return

		const node = this.#tree.get(namespace)

		if (!node?.definition) {
			throw new Error(
				`Missing namespace definition for 'rajt ${namespace}'`
			)
		}

		this.#registeredNamespaces.add(namespace)
		this.#walkTreeAndRegister(namespace, node, `rajt ${namespace}`)
	}

	/**
	 * Defines a single command and its corresponding definition.
	 */
	#defineOne({
		command,
		definition,
	}: {
		command: Command;
		definition:
			| AliasDefinition
			| CreateCommandResult<NamedArgDefinitions>
			| NamespaceDefinition;
	}) {
		if (isAliasDefinition(definition))
			this.#upsertDefinition({ type: "alias", command, ...definition })

		if (isCommandDefinition(definition)) {
			this.#upsertDefinition({ type: "command", command, ...definition })
		} else if (isNamespaceDefinition(definition)) {
			this.#upsertDefinition({ type: "namespace", command, ...definition })
		}
	}

	/**
	 * Finds a node in the definition tree for the given command.
	 *
	 * @example
	 *
	 * this.#upsertDefinition({
	 *   type: 'command',
	 *   command: 'rajt hello',
	 *   handler: "helloHandlerFunction",
	 *   metadata: {
	 *     description: "Say hello",
	 *     status: "stable",
	 *   }
	 * });
	 *
	 * const node = this.#findNodeFor('rajt hello');
	 * console.log(node.definition.command); // Output: 'rajt hello'
	 *
	 * const nonExistentNode = this.#findNodeFor('rajt unknown');
	 * console.log(nonExistentNode); // Output: undefined
	 */
	#findNodeFor(command: Command) {
		const segments = command.split(" ").slice(1) // eg. ["versions", "secret", "put"]

		let node = this.#DefinitionTreeRoot
		for (const segment of segments) {
			const child = node.subtree.get(segment)
			if (!child)
				return undefined

			node = child
		}

		return node
	}

	/**
	 * Finds the parent node of a command in the tree.
	 *
	 * @example
	 *
	 * this.#upsertDefinition({
	 *   type: 'namespace',
	 *   command: 'rajt interact',
	 *   metadata: {
	 *     description: "Greet",
	 *     status: "stable",
	 *   }
	 * });
	 * this.#upsertDefinition({
	 *   type: 'command',
	 *   command: 'rajt interact hello',
	 *   handler: () => {},
	 *   metadata: {
	 *     description: "Say hello",
	 *     status: "stable"
	 *   }
	 * });
	 *
	 * const parentNode = this.#findParentFor('rajt interact hello');
	 * console.log(parentNode.definition.command); // Output: 'rajt interact'
	 */
	#findParentFor(command: Command) {
		const parentCommand = command.split(" ").slice(0, -2).join(" ") as Command

		return this.#findNodeFor(parentCommand)
	}

	/**
	 * Resolves the definition chain for a given command, following aliases and parent commands.
	 *
	 * @example
	 *
	 * this.#upsertDefinition({
	 *   type: 'alias',
	 *   command: 'rajt greet',
	 *   aliasOf: 'rajt hello',
	 *   metadata: {
	 *     description: "A greeting alias for hello",
	 *     status: "stable"
	 *   }
	 * });
	 *
	 * const chain = this.#resolveDefinitionChain({
	 *   type: 'alias',
	 *   command: 'rajt greet',
	 *   aliasOf: 'rajt hello',
	 *   metadata: {
	 *     description: "A greeting alias for hello",
	 *     status: "stable"
	 *   }
	 * });
	 * console.log(chain.map(def => def.command)); // Output: ['"rajt greet" => "rajt hello"']
	 *
	 * // The example throws an error because of a circular reference
	 * this.#upsertDefinition({
	 *   type: 'alias',
	 *   command: 'rajt hello',
	 *   aliasOf: 'rajt greet',
	 *   metadata: {
	 *     description: "Alias for greet",
	 *     status: "stable"
	 *   }
	 * });
	 * const chain = this.#resolveDefinitionChain({
	 *   type: 'alias',
	 *   command: 'rajt greet',
	 *   aliasOf: 'rajt hello',
	 *   metadata: {
	 *     description: "A greeting alias for hello",
	 *     status: "stable"
	 *   }
	 * });
	 */
	#resolveDefinitionChain(def: InternalDefinition) {
		const chain: InternalDefinition[] = []
		const stringifyChain = (...extra: InternalDefinition[]) =>
			[...chain, ...extra].map(({ command }) => `"${command}"`).join(" => ")

		while (true) {
			if (chain.includes(def)) {
				throw new Error(
					`Circular reference detected for alias definition: "${def.command}" (resolving from ${stringifyChain(def)})`
				)
			}

			chain.push(def)

			const node =
				def.type === "alias"
					? this.#findNodeFor(def.aliasOf)
					: this.#findParentFor(def.command)

			if (node === this.#DefinitionTreeRoot) {
				return chain
			}

			if (!node?.definition) {
				throw new Error(
					`Missing definition for "${def.type === "alias" ? def.aliasOf : def.command}" (resolving from ${stringifyChain()})`
				)
			}

			def = node.definition
		}
	}

	/**
	 * Resolves a definition node, returning a non-alias definition and its associated metadata.
	 *
	 * @example
	 *
	 * this.#upsertDefinition({
	 *   type: 'command',
	 *   command: 'rajt hello',
	 *   handler: (args, { config }) => {},
	 *   metadata: {
	 *     description: "Say hello",
	 *     status: "stable",
	 *   }
	 * });
	 * this.#upsertDefinition({
	 *   type: 'alias',
	 *   command: 'rajt greet',
	 *   aliasOf: 'rajt hello',
	 *   metadata: {
	 *     description: "A greeting alias for hello",
	 *     status: "stable"
	 *   }
	 * });
	 *
	 * const { definition, subtree } = this.#resolveDefinitionNode({
	 *   type: 'alias',
	 *   command: 'rajt greet',
	 *   aliasOf: 'rajt hello',
	 *   metadata: {
	 *     description: "A greeting alias for hello",
	 *     status: "stable"
	 *   }
	 * });
	 * console.log(definition.command); // Output: 'rajt hello'
	 * console.log(subtree); // Output: empty Map if 'rajt hello' has no further subcommands
	 */
	#resolveDefinitionNode(node: DefinitionTreeNode) {
		assert(node.definition)
		const chain = this.#resolveDefinitionChain(node.definition)

		// get non-alias (resolved) definition
		const resolvedDef = chain.find((def) => def.type !== "alias")
		assert(resolvedDef)

		// get subtree for the resolved node
		const { subtree } =
			node.definition.type !== "alias"
				? node
				: this.#findNodeFor(resolvedDef.command) ?? node

		const definition: InternalDefinition = {
			// take all properties from the resolved alias
			...resolvedDef,
			// keep the original command
			command: node.definition.command,
			// flatten metadata from entire chain (decreasing precedence)
			metadata: Object.assign(
				{},
				...chain.map((def) => def.metadata).reverse()
			),
		}

		return { definition, subtree }
	}

	/**
	 * Inserts or updates a command definition in the tree. When a command, alias, or namespace is added to the tree
	 * it will first split it into segments, e.g.
	 *
	 * `rajt namespace-a` => ["namespace-a", "command-a"]
	 *
	 * Then it will walk through the segments and create a new node for each segment, creating an empty definition and
	 * a subtree for each. The next segment is then defined on that subtree.
	 *
	 * When the last segment is reached, the definition is added. This way, only commands and aliases have definitions, while
	 * namespaces are just nodes in the tree.
	 *
	 * @example
	 *
	 * this.#upsertDefinition({ type: 'command', command: 'rajt command-a', ... });
	 * this.#upsertDefinition({ type: 'namespace', command: 'rajt namespace-b', ... });
	 * this.#upsertDefinition({ type: 'command', command: 'rajt command-b', ... });
	 *
	 * // Resulting tree:
	 *
	 * this.#DefinitionTreeRoot: {
	 *   "subtree": {
	 *     "command-a": {
	 *       "definition": {
	 *         "type": "command",
	 *         "command": "rajt command-a",
	 *         "handler": (args, { config }) => {},
	 *         "metadata": { "description": "Command a" }
	 *       },
	 *       "subtree": new Map()
	 *     },
	 *     "namespace-b": {
	 *       "subtree": {
	 *         "command-b": {
	 *           "definition": {
	 *             "type": "command",
	 *             "command": "rajt namespace-b command-b",
	 *             "handler": (args, { config }) => {},
	 *             "metadata": { "description": "Command b" }
	 *           },
	 *           "subtree": new Map()
	 *         }
	 *       }
	 *     }
	 *   }
	 * }
	 */
	#upsertDefinition(def: InternalDefinition) {
		const segments = def.command.split(" ").slice(1) // eg. ["versions", "secret", "put"]

		let node = this.#DefinitionTreeRoot
		for (const segment of segments) {
			const subtree = node.subtree
			let child = subtree.get(segment)

			// If the child doesn't exist, then create it as a namespace (i.e. without a definition)
			if (!child) {
				child = {
					definition: undefined,
					subtree: new Map(),
				}
				subtree.set(segment, child)
			}

			node = child
		}

		// Now that all the segments are created, we can set its definition.
		// Given that `node` is currently pointing to the last segment, the definition will be set
		// at that point in the tree. However, if it already exists, then this command has already
		// been defined and we should throw an error.
		if (node.definition) {
			throw new Error(
				`Duplicate definition for "${def.command}"`
			)
		}

		node.definition = def

		return node
	}

	/**
	 * Walks through the definition tree and registers all subcommands for a given segment.
	 */
	#walkTreeAndRegister(
		segment: string,
		node: DefinitionTreeNode,
		fullCommand: Command
	) {
		if (!node.definition) {
			throw new Error(
				`Missing namespace definition for '${fullCommand}'`
			)
		}

		const aliasOf = node.definition.type === "alias" && node.definition.aliasOf
		const { definition: def, subtree } = this.#resolveDefinitionNode(node)

		if (aliasOf) {
			def.metadata.description += `\n\nAlias for "${aliasOf}".`
		}

		if (def.metadata.deprecated) {
			def.metadata.deprecatedMessage ??= `Deprecated: "${def.command}" is deprecated`
		}

		if (def.metadata.status !== "stable") {
			def.metadata.description += chalk.hex(BETA_CMD_COLOR)(
				` [${def.metadata.status}]`
			)

			def.metadata.statusMessage ??= constructStatusMessage(
				def.command,
				def.metadata.status
			)
		}

		if (def.type === "command") {
			// inference from positionalArgs
			const commandPositionalArgsSuffix = def.positionalArgs
				?.map((key) => {
					const { demandOption, array } = def.args?.[key] ?? {}
					return demandOption
						? `<${key}${array ? ".." : ""}>` // <key> or <key..>
						: `[${key}${array ? ".." : ""}]` // [key] or [key..]
				})
				.join(" ")

			if (commandPositionalArgsSuffix) {
				segment += " " + commandPositionalArgsSuffix
			}
		}

		// Create the next iteration of the walker and pass it to the register function so that it can be called
		// after the current command has been registered.
		const registerSubTreeCallback = () => {
			for (const [nextSegment, nextNode] of subtree.entries()) {
				this.#walkTreeAndRegister(
					nextSegment,
					nextNode,
					`${fullCommand} ${nextSegment}`
				)
			}
		}

		this.#registerCommand(segment, def, registerSubTreeCallback)
	}
}

/**
 * Custom error class for command registration issues.
 */
// export class CommandRegistrationError extends Error {}


export function constructStatusMessage(
	command: string,
	status: Metadata["status"]
) {
	const indefiniteArticle = "aeiou".includes(status[0]) ? "an" : "a"
	return `🚧 \`${command}\` is ${indefiniteArticle} ${status} command. Please report any issues to https://github.com/attla/rajt/issues/new/choose`
}
