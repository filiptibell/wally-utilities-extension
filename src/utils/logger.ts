import * as vscode from "vscode";






export type WallyLogLevel = "Quiet" | "Normal" | "Verbose";

export class WallyLogHelper implements vscode.Disposable {
	private out: vscode.OutputChannel | null;
	private lev: WallyLogLevel;
	
	constructor(logLevel?: WallyLogLevel) {
		this.out = vscode.window.createOutputChannel("Wally", "jsonc");
		this.lev = logLevel || "Normal";
	}
	
	isQuiet() {
		return this.lev === "Quiet";
	}
	
	isNormal() {
		return this.lev !== "Quiet";
	}
	
	isVerbose() {
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
		if (this.out && this.isNormal()) {
			this.out.appendLine(`// ${txt}`);
		}
	}
	
	normalJson(json: any) {
		if (this.out && this.isNormal()) {
			this.out.appendLine(JSON.stringify(json, undefined, 4));
		}
	}
	
	verboseText(txt: string) {
		if (this.out && this.isVerbose()) {
			this.out.appendLine(`// ${txt}`);
		}
	}
	
	verboseJson(json: any) {
		if (this.out && this.isVerbose()) {
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





let globalLog: WallyLogHelper | null = null;

export const getGlobalLog = () => {
	if (globalLog) {
		return globalLog;
	} else {
		globalLog = new WallyLogHelper();
		return globalLog;
	}
};