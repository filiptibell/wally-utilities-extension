import * as vscode from "vscode";

import { runWallyCliCommand } from "../wally/cli";

// https://stackoverflow.com/questions/51851677/how-to-get-argument-types-from-function-in-typescript
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

type Commands = typeof ALL_COMMANDS;
type CommandName = keyof Commands;





const runCliCommand = (args: {
	command: string,
	args?: string[]
}) => {
	runWallyCliCommand(args.command, ...(args.args ? args.args : []));
};

const previewFile = (args: {
	fileUri: string | vscode.Uri
}) => {
	if (typeof args.fileUri === "string") {
		const uri = vscode.Uri.parse(args.fileUri);
		vscode.commands.executeCommand("markdown.showPreview", uri);
	} else {
		vscode.commands.executeCommand("markdown.showPreview", args.fileUri);
	}
};

const error = (args: {
	message: string
}) => {
	vscode.window.showErrorMessage(args.message);
};

const warn = (args: {
	message: string
}) => {
	vscode.window.showWarningMessage(args.message);
};

const hint = (args: {
	message: string
}) => {
	vscode.window.showInformationMessage(args.message);
};





const ALL_COMMANDS = {
	runCliCommand: runCliCommand,
	previewFile: previewFile,
	error: error,
	warn: warn,
	hint: hint,
};





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
	
	run<N extends CommandName>(commandName: N, ...args: ArgumentTypes<Commands[N]>) {
		const handler = ALL_COMMANDS[commandName];
		// We need to cast here because of typescript error 2556:
		// "A spread argument must either have a tuple type or be passed to a rest parameter"
		// Correct types are always enforced by the above arguments anyways
		const untyped = handler as any;
		untyped(...args);
	};
}
