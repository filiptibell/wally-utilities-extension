import * as vscode from "vscode";

import { getGlobalLog, WallyLogHelper } from "../../utils/logger";

import cliCommands from "./cli";
import fileCommands from "./files";
import loggingCommands from "./logging";
import wallyCommands from "./wally";

const ALL_COMMANDS = {
	...cliCommands,
	...fileCommands,
	...loggingCommands,
	...wallyCommands,
};





// https://stackoverflow.com/questions/51851677/how-to-get-argument-types-from-function-in-typescript
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

type Commands = typeof ALL_COMMANDS;
type CommandName = keyof Commands;





export const getCommandLink = <N extends CommandName>(commandName: N) => {
	return vscode.Uri.parse(`command:wally.${commandName}`);
};

export const getCommandLinkWithArgs = <N extends CommandName>(commandName: N, ...args: ArgumentTypes<Commands[N]>) => {
	const encoded = encodeURIComponent(JSON.stringify(args));
	return vscode.Uri.parse(`${getCommandLink(commandName)}?${encoded}`);
};





export class WallyCommandsProvider implements vscode.Disposable {
	private log: WallyLogHelper;
	
	private disposed: boolean = false;
	private disposables: vscode.Disposable[];
	
	constructor() {
		const disposables = [];
		for (const [commandName, commandHandler] of Object.entries(ALL_COMMANDS)) {
			const commandIdentifier = `wally.${commandName}`;
			disposables.push(vscode.commands.registerCommand(commandIdentifier, (...args) => {
				// Log some debugging stuff
				this.log.normalText(`Running command "${commandName}"`);
				if (this.log.isVerbose()) {
					this.log.verboseText("Arguments:");
					this.log.verboseJson(args);
				}
				// We need to cast here because of typescript
				// error 2556, see run method for more info.
				const untyped = commandHandler as any;
				return untyped(...args);
			}));
		}
		this.disposables = disposables;
		this.log = getGlobalLog();
	}
	
	dispose() {
		if (this.disposed !== true) {
			this.disposed = true;
			for (const disposable of this.disposables) {
				disposable.dispose();
			}
		}
	}
	
	run<Name extends CommandName>(commandName: Name, ...args: ArgumentTypes<Commands[Name]>): ReturnType<Commands[Name]> {
		// We need to cast `handler` to `any` here because of typescript error 2556:
		// "A spread argument must either have a tuple type or be passed to a rest parameter"
		// Correct types are always enforced by the above arguments
		const handler = ALL_COMMANDS[commandName];
		const untyped = handler as any;
		return untyped(...args);
	};
}
