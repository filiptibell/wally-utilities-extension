import * as vscode from "vscode";





export const previewFile = (args: {
	fileUri: string | vscode.Uri
}) => {
	if (typeof args.fileUri === "string") {
		const uri = vscode.Uri.parse(args.fileUri);
		vscode.commands.executeCommand("markdown.showPreview", uri);
	} else {
		vscode.commands.executeCommand("markdown.showPreview", args.fileUri);
	}
};





export default {
	previewFile,
};
