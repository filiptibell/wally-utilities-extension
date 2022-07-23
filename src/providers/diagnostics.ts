import * as vscode from "vscode";

import { PUBLIC_REGISTRY_URL } from "../utils/constants";

import { getGlobalLog, WallyLogHelper } from "../utils/logger";

import { isValidSemver } from "../utils/semver";

import { matchClosestOption, getMatchDistance } from "../utils/matching";

import { wallyStatusBar } from "../wally/statusbar";

import { WallyFilesystemWatcher } from "../wally/watcher";

import { getRealmCorrection, getRealmSection, WallyPackageRealm } from "../wally/base";

import { getRegistryHelper, WallyRegistryHelper } from "../wally/registry";

import {
	parseWallyManifest,
	WallyManifest,
	WallyManifestDependency,
} from "../wally/manifest";





const VALID_REALMS = new Set(["shared", "server", "dev"]);

const DEFAULT_DIAGNOSTIC_MESSAGES = new Map([
	// Errors
	["W-101", "Invalid package author.\nDid you mean `<PACKAGE_AUTHOR>`?"],
	["W-102", "Invalid package name.\nDid you mean `<PACKAGE_NAME>`?"],
	["W-103", "Invalid package version.\nDid you mean `<VERSION_IDENTIFIER>`?"],
	["W-104", "Invalid package realm.\nDid you mean `<REALM_NAME>`?"],
	["W-105", "Invalid package registry.\nDid you mean `<REGISTRY_NAME>`?"],
	// Warnings
	["W-201", "Missing package author."],
	["W-202", "Missing package name."],
	["W-203", "Missing package version."],
	["W-204", "Missing package realm."],
	["W-205", "Missing package registry."],
	// Information
	["W-301", "A newer package version is available.\nThe latest version is `<PACKAGE_VERSION>`."],
	["W-302", "Package is a `<REALM_NAME>` dependency but was listed in `<REALM_CURRENT>`.\nDid you mean to list it under `<REALM_SECTION>`?"],
]);










const getManifestRegistryHelper = async (manifest: WallyManifest) => {
	try {
		const registry = getRegistryHelper(manifest.package.registry.cleanedText);
		await registry.getPackageAuthors();
		return registry;
	} catch (_) {
		return null;
	}
};

const getClosestRealmName = (realm: string) => {
	const options = new Array<string>();
	for (const option of VALID_REALMS) {
		options.push(option);
	}
	return matchClosestOption(realm, options, "shared");
};

const getClosestRegistryName = (registry: string) => {
	if (
		registry.length <= 0
		|| PUBLIC_REGISTRY_URL.startsWith(registry)
		|| getMatchDistance(registry, PUBLIC_REGISTRY_URL.slice(0, registry.length)) <= 0.25
	) {
		return PUBLIC_REGISTRY_URL;
	}
	return undefined;
};

const getClosestPackageAuthor = async (
	registry: WallyRegistryHelper,
	author: string
): Promise<string | undefined> => {
	const authors = await registry.getPackageAuthors();
	if (authors) {
		const result = matchClosestOption(author, authors, author);
		if (result !== author) {
			return result;
		}
	}
	return undefined;
};

const getClosestPackageName = async (
	registry: WallyRegistryHelper,
	author: string,
	name: string
): Promise<string | undefined> => {
	const names = await registry.getPackageNames(author);
	if (names) {
		const result = matchClosestOption(name, names, name);
		if (result !== name) {
			return result;
		}
	}
	return undefined;
};

const getClosestPackageVersion = async (
	registry: WallyRegistryHelper,
	author: string,
	name: string,
	version: string
): Promise<string | undefined> => {
	const versions = await registry.getPackageVersions(author, name);
	if (versions) {
		const result = matchClosestOption(version, versions, version);
		if (result !== version) {
			return result;
		}
	}
	return undefined;
};










const createDiagnostic = (
	start: vscode.Position,
	end: vscode.Position,
	code: string,
	pattern?: string,
	replacement?: string,
	messageOverride?: string,
) => {
	let sev = vscode.DiagnosticSeverity.Error;
	if (code.startsWith("W-2")) {
		sev = vscode.DiagnosticSeverity.Warning;
	} else if (code.startsWith("W-3")) {
		sev = vscode.DiagnosticSeverity.Information;
	} else if (code.startsWith("W-4")) {
		sev = vscode.DiagnosticSeverity.Hint;
	}
	let mess = messageOverride ?? sev.toString();
	if (!messageOverride) {
		const defaultMessage = DEFAULT_DIAGNOSTIC_MESSAGES.get(code);
		if (defaultMessage) {
			mess = defaultMessage;
		}
		if (
			pattern
			&& pattern.length > 0
			&& replacement
			&& replacement.length > 0
		) {
			mess = mess.replace(
				pattern,
				replacement
			);
		} else {
			mess = mess.split("\n")[0];
		}
	}
	const range = new vscode.Range(start, end);
	const item = new vscode.Diagnostic(range, mess, sev);
	if (code) {
		item.code = code;
	}
	return item;
};

const createDependencyDiagnostic = (
	dependency: WallyManifestDependency,
	code: string,
	pattern?: string,
	replacement?: string,
	messageOverride?: string,
) => {
	return createDiagnostic(
		dependency.originalStart,
		dependency.originalEnd,
		code,
		pattern,
		replacement,
		messageOverride,
	);
};










const diagnoseDependency = async (
	manifest: WallyManifest,
	dependency: WallyManifestDependency,
	dependencyRealm: WallyPackageRealm
): Promise<vscode.Diagnostic | null> => {
	const registry = await getManifestRegistryHelper(manifest);
	if (!registry) {
		return null;
	}
	// Check package author validity
	if (!dependency.hasFullAuthor && !(await registry.isValidAuthor(dependency.author))) {
		return createDependencyDiagnostic(dependency, "W-201");
	}
	if (!(await registry.isValidAuthor(dependency.author))) {
		const closest = await getClosestPackageAuthor(registry, dependency.author);
		return createDependencyDiagnostic(dependency, "W-101", "<PACKAGE_AUTHOR>", closest);
	}
	// Check package name validity
	if (!dependency.hasFullName && !(await registry.isValidPackage(dependency.author, dependency.name))) {
		return createDependencyDiagnostic(dependency, "W-202");
	}
	if (!(await registry.isValidPackage(dependency.author, dependency.name))) {
		const closest = await getClosestPackageName(registry, dependency.author, dependency.name);
		return createDependencyDiagnostic(dependency, "W-102", "<PACKAGE_NAME>", closest);
	}
	// Check package version validity
	if (dependency.version === "") {
		return createDependencyDiagnostic(dependency, "W-203");
	}
	if (!(await registry.isValidVersion(dependency.author, dependency.name, dependency.fullVersion))) {
		const closest = await getClosestPackageVersion(registry, dependency.author, dependency.name, dependency.version);
		return createDependencyDiagnostic(dependency, "W-103", "<VERSION_IDENTIFIER>", closest);
	}
	// Check if the package might be misplaced, like
	// if a server package is under shared dependencies
	const fullInfo = await registry.getFullPackageInfo(dependency.author, dependency.name, dependency.fullVersion);
	if (fullInfo) {
		const definedRealm = fullInfo.package.realm;
		const corrected = getRealmCorrection(dependencyRealm, definedRealm);
		if (corrected) {
			const message = DEFAULT_DIAGNOSTIC_MESSAGES.get("W-302");
			if (message) {
				let replaced = message.slice(0, message.length);
				replaced = replaced.replace("<REALM_NAME>", definedRealm);
				replaced = replaced.replace("<REALM_CURRENT>", getRealmSection(dependencyRealm));
				replaced = replaced.replace("<REALM_SECTION>", getRealmSection(corrected));
				return createDependencyDiagnostic(dependency, "W-302", undefined, undefined, replaced);
			}
		}
	}
	// Check if there is a newer version
	if (await registry.isOldVersion(dependency.author, dependency.name, dependency.fullVersion)) {
		const availableVersions = await registry.getPackageVersions(dependency.author, dependency.name);
		const latestVersion = availableVersions ? availableVersions[0] : undefined;
		return createDependencyDiagnostic(dependency, "W-301", "<PACKAGE_VERSION>", latestVersion);
	}
	// No diagnostic, all is well (that we know of)
	return null;
};

const diagnosePackageRealm = async (manifest: WallyManifest) => {
	const realm = manifest.package.realm;
	if (VALID_REALMS.has(realm.cleanedText)) {
		return null;
	}
	return createDiagnostic(
		realm.originalStart,
		realm.originalEnd,
		"W-104",
		"<REALM_NAME>",
		getClosestRealmName(realm.cleanedText)
	);
};

const diagnosePackageRegistry = async (manifest: WallyManifest) => {
	const registry = await getManifestRegistryHelper(manifest);
	if (registry) {
		return null;
	}
	const reg = manifest.package.registry;
	return createDiagnostic(
		reg.originalStart,
		reg.originalEnd,
		"W-105",
		"<REGISTRY_NAME>",
		getClosestRegistryName(reg.cleanedText)
	);
	return null;
};

const diagnosePackageVersion = async (manifest: WallyManifest) => {
	const version = manifest.package.version;
	if (isValidSemver(version.cleanedText)) {
		return null;
	}
	return createDiagnostic(version.originalStart, version.originalEnd, "W-103");
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
	
	private documents: Map<string, vscode.TextDocument>;
	
	private enabled: boolean;
	
	constructor(watcher: WallyFilesystemWatcher) {
		this.log = getGlobalLog();
		this.col = vscode.languages.createDiagnosticCollection("wally");
		this.documents = new Map();
		this.enabled = true;
		// Listen to wally files
		watcher.onDidCreate((uri, doc) => {
			this.init(uri, doc);
		});
		watcher.onDidChange((uri, doc) => {
			this.refresh(uri, doc);
		});
		watcher.onDidDelete(uri => {
			this.delete(uri);
		});
	}
	
	dispose() {
		this.documents.clear();
		this.col.dispose();
	}
	
	async init(uri: vscode.Uri, doc: vscode.TextDocument) {
		if (!this.documents.has(uri.path)) {
			this.documents.set(uri.path, doc);
			this.refresh(uri, doc);
		}
	}
	
	async refresh(uri: vscode.Uri, doc: vscode.TextDocument) {
		// Check if this uri has been registered for diagnostics
		if (this.documents.has(uri.path)) {
			if (this.enabled) {
				// Diagnose everything asynchronously
				const newDiags = [];
				const manifest = parseWallyManifest(doc);
				if (manifest) {
					// Diagnose the basic package fields
					newDiags.push(diagnosePackageRealm(manifest));
					newDiags.push(diagnosePackageRegistry(manifest));
					newDiags.push(diagnosePackageVersion(manifest));
					// Diagnose all dependencies
					const allDeps: [WallyPackageRealm, WallyManifestDependency[]][] = [
						["shared", manifest.dependencies.shared],
						["server", manifest.dependencies.server],
						["dev", manifest.dependencies.dev],
					];
					for (const [dependencyRealm, dependencyList] of allDeps) {
						for (const dependency of dependencyList) {
							newDiags.push(diagnoseDependency(
								manifest,
								dependency,
								dependencyRealm,
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
			} else {
				this.col.delete(uri);
			}
		} else {
			this.col.delete(uri);
		}
	}
	
	async delete(uri: vscode.Uri) {
		if (this.documents.has(uri.path)) {
			this.documents.delete(uri.path);
			this.col.delete(uri);
		}
	}
	
	async refreshAll() {
		const promises = [];
		for (const doc of this.documents.values()) {
			promises.push(this.refresh(doc.uri, doc));
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
