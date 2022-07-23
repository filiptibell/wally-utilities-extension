import * as vscode from "vscode";

import cliCommands from "./cli";
import fileCommands from "./files";
import loggingCommands from "./logging";

const ALL_COMMANDS = {
	...cliCommands,
	...fileCommands,
	...loggingCommands,
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
	private disposed: boolean = false;
	private disposables: vscode.Disposable[];
	
	constructor() {
		const disposables = [];
		for (const [commandIdentifier, commandHandler] of Object.entries(ALL_COMMANDS)) {
			disposables.push(vscode.commands.registerCommand(
				commandIdentifier,
				commandHandler,
			));
		}
		this.disposables = disposables;
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
		const handler = ALL_COMMANDS[commandName];
		// We need to cast here because of typescript error 2556:
		// "A spread argument must either have a tuple type or be passed to a rest parameter"
		// Correct types are always enforced by the above arguments anyways
		const untyped = handler as any;
		return untyped(...args);
	};
}
