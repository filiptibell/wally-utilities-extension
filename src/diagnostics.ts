import * as vscode from "vscode";

import { getGlobalLog, WallyLogHelper } from "./utils/logger";

import { wallyStatusBar } from "./utils/statusbar";

import { WallyFilesystemWatcher } from "./wally/watcher";

import { getRegistryHelper } from "./wally/registry";

import {
	parseWallyManifest,
	WallyManifest,
	WallyDependency,
} from "./wally/manifest";





const DEFAULT_DIAGNOSTIC_MESSAGES = new Map([
	// Errors
	["W-101", "Invalid package author"],
	["W-102", "Invalid package name"],
	["W-103", "Invalid package version"],
	// Warnings
	["W-201", "Missing package author"],
	["W-202", "Missing package name"],
	["W-203", "Missing package version"],
	// Information
	["W-301", "A newer package version is available: `<PACKAGE_VERSION>`"],
]);





const createDependencyDiagnostic = (
	dependency: WallyDependency,
	code: string,
	message?: string
) => {
	let sev = vscode.DiagnosticSeverity.Error;
	if (code.startsWith("W-2")) {
		sev = vscode.DiagnosticSeverity.Warning;
	} else if (code.startsWith("W-3")) {
		sev = vscode.DiagnosticSeverity.Information;
	} else if (code.startsWith("W-4")) {
		sev = vscode.DiagnosticSeverity.Hint;
	}
	let mess = message ?? sev.toString();
	if (!message || message.length <= 0) {
		const defaultMessage = DEFAULT_DIAGNOSTIC_MESSAGES.get(code);
		if (defaultMessage) {
			mess = defaultMessage;
		}
	}
	const rangeStart = new vscode.Position(
		dependency.end.line,
		dependency.end.character - dependency.originalText.length
	);
	const range = new vscode.Range(rangeStart, dependency.end);
	const item = new vscode.Diagnostic(range, mess, sev);
	if (code) {
		item.code = code;
	}
	return item;
};





const diagnoseDependency = async (
	manifest: WallyManifest,
	dependency: WallyDependency
): Promise<vscode.Diagnostic | null> => {
	const registry = getRegistryHelper(manifest.registry);
	// Check package author validity
	if (!dependency.hasFullAuthor && !(await registry.isValidAuthor(dependency.author))) {
		return createDependencyDiagnostic(dependency, "W-201");
	}
	if (!(await registry.isValidAuthor(dependency.author))) {
		return createDependencyDiagnostic(dependency, "W-101");
	}
	// Check package name validity
	if (!dependency.hasFullName && !(await registry.isValidPackage(dependency.author, dependency.name))) {
		return createDependencyDiagnostic(dependency, "W-202");
	}
	if (!(await registry.isValidPackage(dependency.author, dependency.name))) {
		return createDependencyDiagnostic(dependency, "W-102");
	}
	// Check package version validity
	if (dependency.version === "") {
		return createDependencyDiagnostic(dependency, "W-203");
	}
	if (!(await registry.isValidVersion(dependency.author, dependency.name, dependency.fullVersion))) {
		return createDependencyDiagnostic(dependency, "W-103");
	}
	// Check if there is a newer version
	if (await registry.isOldVersion(dependency.author, dependency.name, dependency.fullVersion)) {
		const message = DEFAULT_DIAGNOSTIC_MESSAGES.get("W-301");
		if (message) {
			const availableVersions = await registry.getPackageVersions(dependency.author, dependency.name);
			if (availableVersions && availableVersions.length > 0) {
				const withLatestVersion = message.replace("<PACKAGE_VERSION>", availableVersions[0]);
				return createDependencyDiagnostic(dependency, "W-301", withLatestVersion);
			}
		}
	}
	// No diagnostic, all is well (that we know of)
	return null;
};





const countErrorDiagnostics = (diagnostics: vscode.Diagnostic[]) => {
	let total = 0;
	for (const diagnostic of diagnostics) {
		const code = diagnostic.code?.toString();
		if (code && code.startsWith("W-1")) {
			total += 1;
		}
	}
	return total;
};

const countWarningDiagnostics = (diagnostics: vscode.Diagnostic[]) => {
	let total = 0;
	for (const diagnostic of diagnostics) {
		const code = diagnostic.code?.toString();
		if (code && code.startsWith("W-2")) {
			total += 1;
		}
	}
	return total;
};

const countUpgradeDiagnostics = (diagnostics: vscode.Diagnostic[]) => {
	let total = 0;
	for (const diagnostic of diagnostics) {
		if (diagnostic.code === "W-301") {
			total += 1;
		}
	}
	return total;
};





export class WallyDiagnosticsProvider implements vscode.Disposable {
	private log: WallyLogHelper;
	private col: vscode.DiagnosticCollection;
	private uris: Map<string, vscode.Uri>;
	
	private enabled: boolean;
	
	constructor(watcher: WallyFilesystemWatcher) {
		this.log = getGlobalLog();
		this.col = vscode.languages.createDiagnosticCollection("wally");
		this.uris = new Map();
		this.enabled = true;
		// Listen to wally files
		watcher.onDidCreate(uri => {
			this.init(uri);
		});
		watcher.onDidChange(uri => {
			this.refresh(uri);
		});
		watcher.onDidDelete(uri => {
			this.delete(uri);
		});
	}
	
	dispose() {
		this.uris.clear();
		this.col.dispose();
	}
	
	async init(uri: vscode.Uri) {
		if (!this.uris.has(uri.path)) {
			this.uris.set(uri.path, uri);
			this.refresh(uri);
		}
	}
	
	async refresh(uri: vscode.Uri) {
		// Check if this uri has been registered for diagnostics
		if (this.uris.has(uri.path)) {
			if (this.enabled) {
				vscode.workspace.openTextDocument(uri).then(async (doc) => {
					// Check again in case the uri gets deleted
					// while the text document is being opened
					if (this.uris.has(uri.path)) {
						// Diagnose all dependencies asynchronously
						const newDiags = [];
						const manifest = parseWallyManifest(doc);
						if (manifest) {
							for (const dependencyList of [
								manifest.dependencies.shared,
								manifest.dependencies.server,
								manifest.dependencies.dev,
							]) {
								for (const dependency of dependencyList) {
									newDiags.push(diagnoseDependency(
										manifest,
										dependency,
									));
								}
							}
						}
						// Put status bar in "in progress" mode
						wallyStatusBar.setInProgress(true);
						// Wait for all diagnostic results to arrive and add them in
						const diagnostics = await Promise.all(newDiags);
						const filtered = diagnostics.filter(diag => !!diag) as vscode.Diagnostic[];
						this.col.set(uri, filtered);
						if (filtered.length === 1) {
							this.log.verboseText(`Diagnosed 1 manifest issue`);
						} else if (filtered.length > 0) {
							this.log.verboseText(`Diagnosed ${filtered.length} manifest issues`);
						}
						// Set new status bar status
						wallyStatusBar.setErroredCount(countErrorDiagnostics(filtered));
						wallyStatusBar.setWarningCount(countWarningDiagnostics(filtered));
						wallyStatusBar.setUpgradableCount(countUpgradeDiagnostics(filtered));
						wallyStatusBar.setDependencyCount(filtered.length);
						// Move status bar out of "in progress" mode
						wallyStatusBar.setInProgress(false);
					}
				});
			} else {
				this.col.delete(uri);
			}
		} else {
			this.col.delete(uri);
		}
	}
	
	async delete(uri: vscode.Uri) {
		if (this.uris.has(uri.path)) {
			this.uris.delete(uri.path);
			this.refresh(uri);
		}
	}
	
	async refreshAll() {
		const promises = [];
		for (const uri of this.uris.values()) {
			promises.push(this.refresh(uri));
		}
		return Promise.all(promises);
	}
	
	setEnabled(enabled: boolean) {
		if (this.enabled !== enabled) {
			this.enabled = enabled;
			this.refreshAll();
		}
	}
}