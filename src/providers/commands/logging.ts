import * as vscode from "vscode";





export const error = (args: {
	message: string
}) => {
	vscode.window.showErrorMessage(args.message);
};

export const warn = (args: {
	message: string
}) => {
	vscode.window.showWarningMessage(args.message);
};

export const hint = (args: {
	message: string
}) => {
	vscode.window.showInformationMessage(args.message);
};





export default {
	error,
	warn,
	hint,
};;
