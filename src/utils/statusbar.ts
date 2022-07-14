import * as vscode from "vscode";

import {
	EMOJI_OK,
	EMOJI_ERROR,
	EMOJI_WARNING,
	EMOJI_UPGRADE,
	EMOJI_UNKNOWN,
} from "./constants";
 




interface WallyStatusBar extends vscode.StatusBarItem {
	setIsEnabled: (enabled?: boolean) => void;
	setInProgress: (inProgress?: boolean) => void;
	setDependencyCount: (count?: number) => void;
	setUpgradableCount: (count?: number) => void;
	setWarningCount: (count?: number) => void;
	setErroredCount: (count?: number) => void;
}

export const wallyStatusBar: WallyStatusBar = vscode.window.createStatusBarItem(
	vscode.StatusBarAlignment.Left,
	0,
) as WallyStatusBar;

wallyStatusBar.hide();





let statusBarShown = false;

let enabled = true;

let inProgress = false;

let numDependencies = 0;
let numUpgradable = 0;
let numWarnings = 0;
let numErrored = 0;

const updateStatusBar = () => {
	if (!enabled) {
		if (statusBarShown !== false) {
			statusBarShown = false;
			wallyStatusBar.hide();
		}
		return;
	}
	if (inProgress) {
		wallyStatusBar.text = `${EMOJI_UNKNOWN} Wally`;
		if (statusBarShown !== true) {
			statusBarShown = true;
			wallyStatusBar.show();
		}
	} else if (
		numDependencies > 0
		|| numUpgradable > 0
		|| numWarnings > 0
		|| numErrored > 0
	) {
		let text = `${EMOJI_OK} Wally`;
		if (numErrored > 0) {
			text = `${EMOJI_ERROR} Wally - ${numErrored} errors`;
			text = text.replace("1 errors", "1 error");
		} else if (numWarnings > 0) {
			text = `${EMOJI_WARNING} Wally - ${numWarnings} warnings`;
			text = text.replace("1 warnings", "1 warning");
		} else if (numUpgradable > 0) {
			text = `${EMOJI_UPGRADE} Wally - ${numUpgradable} upgradable`;
		}
		wallyStatusBar.text = text;
		if (statusBarShown !== true) {
			statusBarShown = true;
			wallyStatusBar.show();
		}
	} else {
		if (statusBarShown !== false) {
			statusBarShown = false;
			wallyStatusBar.hide();
		}
	}
};





wallyStatusBar.setIsEnabled = (isEnabled?: boolean) => {
	const state = isEnabled !== false;
	if (enabled !== state) {
		enabled = state;
		updateStatusBar();
	}
};

wallyStatusBar.setInProgress = (inProgress?: boolean) => {
	const inProgressStatus = inProgress === true;
	if (inProgress !== inProgressStatus) {
		inProgress = inProgressStatus;
		updateStatusBar();
	}
};

wallyStatusBar.setDependencyCount = (count?: number) => {
	const uintDependencies = Math.max(0, Math.round(count ?? 0));
	if (numDependencies !== uintDependencies) {
		numDependencies = uintDependencies;
		updateStatusBar();
	}
};

wallyStatusBar.setUpgradableCount = (count?: number) => {
	const uintUpgradable = Math.max(0, Math.round(count ?? 0));
	if (numUpgradable !== uintUpgradable) {
		numUpgradable = uintUpgradable;
		updateStatusBar();
	}
};

wallyStatusBar.setWarningCount = (count?: number) => {
	const uintWarnings = Math.max(0, Math.round(count ?? 0));
	if (numWarnings !== uintWarnings) {
		numWarnings = uintWarnings;
		updateStatusBar();
	}
};

wallyStatusBar.setErroredCount = (count?: number) => {
	const uintErrored = Math.max(0, Math.round(count ?? 0));
	if (numErrored !== uintErrored) {
		numErrored = uintErrored;
		updateStatusBar();
	}
};