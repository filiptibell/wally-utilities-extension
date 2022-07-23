import * as vscode from "vscode";

import { } from "../wally/cli";

type CommandHandler = (...args: any[]) => any;





const previewFile = (args: {fileUri: string}) => {
	const uri = vscode.Uri.parse(args.fileUri);
	vscode.commands.executeCommand("markdown.showPreview", uri);
};





export const ALL_COMMANDS = new Map<string, CommandHandler>([
	["wally.previewFile", previewFile],
]);
