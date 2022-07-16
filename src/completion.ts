import * as vscode from "vscode";

import { getGlobalLog, WallyLogHelper } from "./utils/logger";

import { parseWallyManifest, WallyManifestDependency } from "./wally/manifest";

import { getRegistryHelper } from "./wally/registry";






export const WALLY_COMPLETION_SELECTOR = {
	language: "toml",
	scheme: "file"
};

export const WALLY_COMPLETION_TRIGGERS = [
	'"',
	"/",
	"@",
	".",
	"-",
];





const isWallyManifest = (document: vscode.TextDocument) => {
	return document.fileName.endsWith("wally.toml");
};





export class WallyCompletionProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	private log: WallyLogHelper;
	
	private enabled: boolean;
	
	constructor() {
		this.log = getGlobalLog();
		this.enabled = true;
	}
	
	private async providePackageAuthorCompletions(registry: string, items: vscode.CompletionItem[], author: string) {
		const authors = await getRegistryHelper(registry).getPackageAuthors();
		if (authors) {
			const filtered = authors.filter(authorName => authorName.startsWith(author));
			if (this.log.isVerbose()) {
				if (!author || author.length <= 0) {
					this.log.verboseText(`Found ${authors.length} package authors (root)`);
				} else if (filtered.length > 8) {
					this.log.verboseText(`Found ${filtered.length} package authors (filtered)`);
				} else {
					this.log.verboseText(`Found package authors:`);
					this.log.verboseJson(filtered);
				}
			}
			for (const packageAuthor of filtered) {
				const item = new vscode.CompletionItem(packageAuthor);
				item.kind = vscode.CompletionItemKind.User;
				items.push(item);
			}
		}
	}
	
	private async providePackageNameCompletions(registry: string, items: vscode.CompletionItem[], author: string, name: string) {
		const names = await getRegistryHelper(registry).getPackageNames(author);
		if (names) {
			const filtered = names.filter(packageName => packageName.startsWith(name));
			if (this.log.isVerbose()) {
				if (!name || name.length <= 0) {
					this.log.verboseText(`Found ${names.length} package names for author '${author}' (root)`);
				} else if (filtered.length > 8) {
					this.log.verboseText(`Found ${filtered.length} package names for author '${author}' (filtered)`);
				} else {
					this.log.verboseText(`Found package names for author '${author}':`);
					this.log.verboseJson(filtered);
				}
			}
			for (const packageName of filtered) {
				const item = new vscode.CompletionItem(packageName);
				item.kind = vscode.CompletionItemKind.Enum;
				items.push(item);
			}
		}
	}
	
	private async providePackageVersionCompletions(registry: string, items: vscode.CompletionItem[], author: string, name: string, version: string) {
		const versions = await getRegistryHelper(registry).getPackageVersions(author, name);
		if (versions) {
			const filtered = versions.filter(packageVersion => packageVersion.startsWith(version));
			if (this.log.isVerbose()) {
				if (!name || name.length <= 0) {
					this.log.verboseText(`Found ${versions.length} package versions for package '${author}/${name}' (root)`);
				} else if (filtered.length > 8) {
					this.log.verboseText(`Found ${filtered.length} package versions for package '${author}/${name}' (filtered)`);
				} else {
					this.log.verboseText(`Found package versions for package '${author}/${name}':`);
					this.log.verboseJson(filtered);
				}
			}
			for (const [index, packageVersion] of filtered.entries()) {
				const item = new vscode.CompletionItem(packageVersion);
				item.kind = vscode.CompletionItemKind.EnumMember;
				item.sortText = index.toString().padStart(5, "0");
				item.insertText = packageVersion.slice(version.length);
				items.push(item);
			}
		}
	}
	
	async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		// Make sure completion is enabled
		if (!this.enabled) {
			this.log.verboseText("Completion is not enabled");
			return null;
		}
		// Check if this toml file is a wally manifest
		if (isWallyManifest(document)) {
			// Try to parse this wally manifest file
			const items: vscode.CompletionItem[] = [];
			const manifest = parseWallyManifest(document);
			if (manifest) {
				// Look for what dependency our cursor is currently inside
				let found: WallyManifestDependency | null = null;
				for (const dependencyList of [
					manifest.dependencies.shared,
					manifest.dependencies.server,
					manifest.dependencies.dev,
				]) {
					for (const dependency of dependencyList) {
						const deprange = new vscode.Range(dependency.start, dependency.end);
						if (deprange.contains(position)) {
							found = dependency;
							break;
						}
					}
					if (found) {
						break;
					}
				}
				// Add completion items for the found dependency
				if (found) {
					const registryUrl = manifest.package.registry.cleanedText;
					if (found.hasFullAuthor) {
						if (found.hasFullName) {
							await this.providePackageVersionCompletions(
								registryUrl,
								items,
								found.author,
								found.name,
								found.fullVersion
							);
						} else {
							await this.providePackageNameCompletions(
								registryUrl,
								items,
								found.author,
								found.name
							);
						}
					} else {
						await this.providePackageAuthorCompletions(
							registryUrl,
							items,
							found.author
						);
					}
				}
			} else {
				this.log.normalText("Manifest could not be parsed");
			}
			return items;
		}
	}
	
	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}
}