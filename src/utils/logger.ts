import * as vscode from "vscode";






export type WallyLogLevel = "Quiet" | "Normal" | "Verbose";

export class WallyLogHelper implements vscode.Disposable {
	private out: vscode.OutputChannel | null;
	private lev: WallyLogLevel;
	
	constructor(logLevel: WallyLogLevel, outputInitialMessage?: boolean) {
		this.out = vscode.window.createOutputChannel("Wally", "jsonc");
		this.lev = logLevel;
		if (outputInitialMessage) {
			this.out.appendLine(`// Started with log level '${this.lev}'`);
		}
	}
	
	private canOutputNormal() {
		return this.lev !== "Quiet";
	}
	
	private canOutputVerbose() {
		return this.lev === "Verbose";
	}
	
	setLevel(logLevel: WallyLogLevel) {
		if (this.lev !== logLevel) {
			this.lev = logLevel;
			if (this.out) {
				this.out.appendLine(`// Changed log level to '${this.lev}'`);
			}
		}
	}
	
	normalText(txt: string) {
		if (this.out && this.canOutputNormal()) {
			this.out.appendLine(`// ${txt}`);
		}
	}
	
	normalJson(json: any) {
		if (this.out && this.canOutputNormal()) {
			this.out.appendLine(JSON.stringify(json, undefined, 4));
		}
	}
	
	verboseText(txt: string) {
		if (this.out && this.canOutputVerbose()) {
			this.out.appendLine(`// ${txt}`);
		}
	}
	
	verboseJson(json: any) {
		if (this.out && this.canOutputVerbose()) {
			this.out.appendLine(JSON.stringify(json, undefined, 4));
		}
	}
	
	dispose() {
		if (this.out) {
			this.out.dispose();
			this.out = null;
		}
	}
}