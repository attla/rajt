import type {
  Argv,
  ArgumentsCamelCase,
  CommandModule,
	InferredOptionType,
	InferredOptionTypes,
	Options,
	PositionalOptions,
} from 'yargs'

export type CamelCaseKey<K extends PropertyKey> = K extends string ? Exclude<CamelCase<K>, ""> : K
/** Convert literal string types like 'foo-bar' to 'FooBar' */
export type PascalCase<S extends string> = string extends S
	? string
	: S extends `${infer T}-${infer U}`
		? `${Capitalize<T>}${PascalCase<U>}`
		: Capitalize<S>

/** Convert literal string types like 'foo-bar' to 'fooBar' */
export type CamelCase<S extends string> = string extends S
	? string
	: S extends `${infer T}-${infer U}`
		? `${T}${PascalCase<U>}`
		: S

export type OnlyCamelCase<T = Record<string, never>> = {
	[key in keyof T as CamelCaseKey<key>]: T[key];
}

export type Alias<O extends Options | PositionalOptions> = O extends { alias: infer T }
	? T extends Exclude<string, T>
		? { [key in T]: InferredOptionType<O> }
		: // eslint-disable-next-line @typescript-eslint/no-empty-object-type
			{}
	: // eslint-disable-next-line @typescript-eslint/no-empty-object-type
		{}

export type StringKeyOf<T> = Extract<keyof T, string>
export type DeepFlatten<T> = T extends object
	? { [K in keyof T]: DeepFlatten<T[K]> }
	: T

export type Command = `rajt${string}`
export type Metadata = {
	description: string;
	status: "experimental" | "alpha" | "private beta" | "open beta" | "stable";
	statusMessage?: string;
	deprecated?: boolean;
	deprecatedMessage?: string;
	hidden?: boolean;
	// owner: Teams;
	/** Prints something at the bottom of the help */
	epilogue?: string;
	examples?: {
		command: string;
		description: string;
	}[];
	hideGlobalFlags?: string[];
}

export type ArgDefinition = Omit<PositionalOptions, "type"> &
	Pick<Options, "hidden" | "requiresArg" | "deprecated" | "type">;
export type NamedArgDefinitions = { [key: string]: ArgDefinition }

export type HandlerArgs<Args extends NamedArgDefinitions> = DeepFlatten<
	OnlyCamelCase<
		RemoveIndex<
			ArgumentsCamelCase<
				CommonYargsOptions & InferredOptionTypes<Args> & Alias<Args>
			>
		>
	>
>


export type CommandDefinition<
	NamedArgDefs extends NamedArgDefinitions = NamedArgDefinitions,
> = {
	/**
	 * Descriptive information about the command which does not affect behaviour.
	 * This is used for the CLI --help and subcommand --help output.
	 * This should be used as the source-of-truth for status and ownership.
	 */
	metadata: Metadata;
	/**
	 * Controls shared behaviour across all commands.
	 * This will allow rajt commands to remain consistent and only diverge intentionally.
	 */
	behaviour?: {
		/**
		 * By default, rajt's version banner will be printed before the handler is executed.
		 * Set this value to `false` to skip printing the banner.
		 *
		 * @default true
		 */
		printBanner?: boolean | ((args: HandlerArgs<NamedArgDefs>) => boolean);

		/**
		 * By default, rajt will print warnings about the Rajt configuration file.
		 * Set this value to `false` to skip printing these warnings.
		 */
		printConfigWarnings?: boolean;

		/**
		 * By default, rajt will read & provide the rajt.toml/rajt.json configuration.
		 * Set this value to `false` to skip this.
		 */
		provideConfig?: boolean;

		/**
		 * By default, rajt will provide experimental flags in the handler context,
		 * according to the default values in register-yargs.command.ts
		 * Use this to override those defaults per command.
		 */
		// overrideExperimentalFlags?: (
		// 	args: HandlerArgs<NamedArgDefs>
		// ) => ExperimentalFlags;

		/**
		 * If true, then look for a redirect file at `.rajt/deploy/config.json` and use that to find the Rajt configuration file.
		 */
		useConfigRedirectIfAvailable?: boolean;

		/**
		 * If true, print a message about whether the command is operating on a local or remote resource
		 */
		printResourceLocation?:
			| ((args: HandlerArgs<NamedArgDefs>) => boolean)
			| boolean;

		/**
		 * If true, check for environments in the rajt config, if there are some and the user hasn't specified an environment
		 * using the `-e|--env` cli flag, show a warning suggesting that one should instead be specified.
		 */
		warnIfMultipleEnvsConfiguredButNoneSpecified?: boolean;
	};

	/**
	 * A plain key-value object describing the CLI args for this command.
	 * Shared args can be defined as another plain object and spread into this.
	 */
	args?: NamedArgDefs;

	/**
	 * Optionally declare some of the named args as positional args.
	 * The order of this array is the order they are expected in the command.
	 * Use args[key].demandOption and args[key].array to declare required and variadic
	 * positional args, respectively.
	 */
	positionalArgs?: Array<StringKeyOf<NamedArgDefs>>;

	/**
	 * A hook to implement custom validation of the args before the handler is called.
	 * Throw `CommandLineArgsError` with actionable error message if args are invalid.
	 * The return value is ignored.
	 */
	validateArgs?: (args: HandlerArgs<NamedArgDefs>) => void | Promise<void>;

	/**
	 * The implementation of the command which is given camelCase'd args
	 * and a ctx object of convenience properties
	 */
	handler: (
		args: HandlerArgs<NamedArgDefs>,
		ctx: any
		// ctx: HandlerContext
	) => void | Promise<void>;
}

export type NamespaceDefinition = {
	metadata: Metadata;
}

export type AliasDefinition = {
	aliasOf: Command;
	metadata?: Partial<Metadata>;
}

export type InternalDefinition =
	| ({ type: "command"; command: Command } & CommandDefinition)
	| ({ type: "namespace"; command: Command } & NamespaceDefinition)
	| ({ type: "alias"; command: Command } & AliasDefinition)
export type DefinitionTreeNode = {
	definition?: InternalDefinition;
	subtree: DefinitionTree;
}
export type DefinitionTree = Map<string, DefinitionTreeNode>

export type CreateCommandResult<NamedArgDefs extends NamedArgDefinitions> = DeepFlatten<{
  args: HandlerArgs<NamedArgDefs>; // used for type inference only
}>

export type RegisterCommand = (
	segment: string,
	def: InternalDefinition,
	registerSubTreeCallback: () => void
) => void















/**
 * Yargs options included in every rajt command.
 */
export interface CommonYargsOptions {
	v: boolean | undefined;
	// cwd: string | undefined;
	// config: string | undefined;
	// env: string | undefined;
	// "env-file": string[] | undefined;
	// "experimental-provision": boolean | undefined;
	// "experimental-auto-create": boolean;
}

export type CommonYargsArgvSanitized<P = CommonYargsOptions> = OnlyCamelCase<
	RemoveIndex<ArgumentsCamelCase<P>>
>

export type CommonYargsArgv = Argv<CommonYargsOptions>

// See http://stackoverflow.com/questions/51465182/how-to-remove-index-signature-using-mapped-types
export type RemoveIndex<T> = {
	[K in keyof T as string extends K
		? never
		: number extends K
			? never
			: K]: T[K];
}

/**
 * Given some Yargs Options function factory, extract the interface
 * that corresponds to the yargs arguments, remove index types, and only allow camelCase
 */
export type StrictYargsOptionsToInterface<
	T extends (yargs: CommonYargsArgv) => Argv,
> = T extends (yargs: CommonYargsArgv) => Argv<infer P>
	? OnlyCamelCase<RemoveIndex<ArgumentsCamelCase<P>>>
	: never

export type SubHelp = CommandModule<CommonYargsOptions, CommonYargsOptions>

export type ChokidarEventName = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
