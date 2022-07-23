import * as vscode from "vscode";

import {
	EMOJI_OK,
	EMOJI_ERROR,
	EMOJI_WARNING,
	EMOJI_UPGRADE,
	EMOJI_UNKNOWN,
} from "../utils/constants";

import { getWallyVersion } from "../wally/cli";
 




export class WallyStatusBarProvider implements vscode.Disposable {
	private bar: vscode.StatusBarItem;
	
	private statusBarShown: boolean = false;
	
	private enabled: boolean = true;
	private inProgress: boolean = false;
	
	private numDependencies: number = 0;
	private numUpgradable: number = 0;
	private numWarnings: number = 0;
	private numErrored: number = 0;
	
	constructor() {
		this.bar = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			0,
		);
		this.bar.hide();
	}
	
	dispose() {
		this.bar.dispose();
	}
	
	private update() {
		if (!this.enabled) {
			if (this.statusBarShown !== false) {
				this.statusBarShown = false;
				this.bar.hide();
			}
			return;
		}
		const versionString = getWallyVersion();
		const wallyString = versionString ? `Wally ${versionString}` : "Wally";
		if (this.inProgress) {
			this.bar.text = `${EMOJI_UNKNOWN} ${wallyString}`;
			if (this.statusBarShown !== true) {
				this.statusBarShown = true;
				this.bar.show();
			}
		} else if (
			this.numDependencies > 0
			|| this.numUpgradable > 0
			|| this.numWarnings > 0
			|| this.numErrored > 0
		) {
			let text = `${EMOJI_OK} ${wallyString}`;
			if (this.numErrored > 0) {
				text = `${EMOJI_ERROR} ${wallyString} - ${this.numErrored} errors`;
				text = text.replace("1 errors", "1 error");
			} else if (this.numWarnings > 0) {
				text = `${EMOJI_WARNING} ${wallyString} - ${this.numWarnings} warnings`;
				text = text.replace("1 warnings", "1 warning");
			} else if (this.numUpgradable > 0) {
				text = `${EMOJI_UPGRADE} ${wallyString} - ${this.numUpgradable} upgradable`;
			}
			this.bar.text = text;
			if (this.statusBarShown !== true) {
				this.statusBarShown = true;
				this.bar.show();
			}
		} else {
			if (this.statusBarShown !== false) {
				this.statusBarShown = false;
				this.bar.hide();
			}
		}
	}
	
	setIsEnabled(isEnabled?: boolean) {
		const state = isEnabled !== false;
		if (this.enabled !== state) {
			this.enabled = state;
			this.update();
		}
	};
	
	setInProgress(isInProgress?: boolean) {
		const inProgressStatus = isInProgress === true;
		if (this.inProgress !== inProgressStatus) {
			this.inProgress = inProgressStatus;
			this.update();
		}
	};
	
	setDependencyCount(count?: number) {
		const uintDependencies = Math.max(0, Math.round(count ?? 0));
		if (this.numDependencies !== uintDependencies) {
			this.numDependencies = uintDependencies;
			this.update();
		}
	};
	
	setUpgradableCount(count?: number) {
		const uintUpgradable = Math.max(0, Math.round(count ?? 0));
		if (this.numUpgradable !== uintUpgradable) {
			this.numUpgradable = uintUpgradable;
			this.update();
		}
	};
	
	setWarningCount(count?: number) {
		const uintWarnings = Math.max(0, Math.round(count ?? 0));
		if (this.numWarnings !== uintWarnings) {
			this.numWarnings = uintWarnings;
			this.update();
		}
	};
	
	setErroredCount(count?: number) {
		const uintErrored = Math.max(0, Math.round(count ?? 0));
		if (this.numErrored !== uintErrored) {
			this.numErrored = uintErrored;
			this.update();
		}
	};
}
