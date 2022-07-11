import * as vscode from "vscode";

import { parseWallyManifest, WallyDependency } from "./utils/manifest";

import { WallyRegistryHelper } from "./utils/registry";






export const WALLY_COMPLETION_SELECTOR = {
	language: "toml",
	scheme: "file"
};

export const WALLY_COMPLETION_TRIGGERS = [
	".",
	"@",
	"/",
	'"',
];





const isWallyManifest = (document: vscode.TextDocument) => {
	return document.fileName.endsWith("wally.toml");
};





export class WallyCompletionProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	private log: vscode.OutputChannel;
	private reg: WallyRegistryHelper;
	
	private enabled: boolean;
	
	constructor(logChannel: vscode.OutputChannel, registryHelper: WallyRegistryHelper) {
		this.log = logChannel;
		this.reg = registryHelper;
		this.enabled = true;
	}
	
	private logPlaintext(txt: string) {
		// TODO: Check if logging setting is on
		this.log.appendLine(`// ${txt}`);
	}
	
	private logJson(json: any) {
		// TODO: Check if logging setting is on
		this.log.appendLine(JSON.stringify(json, undefined, 4));
	}
	
	private async providePackageAuthorCompletions(items: vscode.CompletionItem[], author: string) {
		const authors = await this.reg.getPackageAuthors();
		if (authors) {
			const filtered = authors.filter(authorName => authorName.startsWith(author));
			for (const packageAuthor of filtered) {
				const item = new vscode.CompletionItem(packageAuthor);
				item.kind = vscode.CompletionItemKind.User;
				items.push(item);
			}
		}
	}
	
	private async providePackageNameCompletions(items: vscode.CompletionItem[], author: string, name: string) {
		const names = await this.reg.getPackageNames(author);
		if (names) {
			const filtered = names.filter(packageName => packageName.startsWith(name));
			for (const packageName of filtered) {
				const item = new vscode.CompletionItem(packageName);
				item.kind = vscode.CompletionItemKind.Enum;
				items.push(item);
			}
		}
	}
	
	private async providePackageVersionCompletions(items: vscode.CompletionItem[], author: string, name: string, version: string) {
		const versions = await this.reg.getPackageVersions(author, name);
		if (versions) {
			const filtered = versions.filter(packageVersion => packageVersion.startsWith(version));
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
			this.logPlaintext("Completion is not enabled");
			return null;
		}
		// Check if this toml file is a wally manifest
		if (isWallyManifest(document)) {
			// Try to parse this wally manifest file
			const items: vscode.CompletionItem[] = [];
			const manifest = parseWallyManifest(document);
			if (manifest) {
				// Set the registry url for the github helper
				if (this.reg.getRegistry() !== manifest.registry) {
					this.reg.setRegistry(manifest.registry);
				}
				// Look for what dependency our cursor is currently inside
				let found: WallyDependency | null = null;
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
					if (found.hasFullAuthor) {
						if (found.hasFullName) {
							await this.providePackageVersionCompletions(items, found.author, found.name, found.version);
						} else {
							await this.providePackageNameCompletions(items, found.author, found.name);
						}
					} else {
						await this.providePackageAuthorCompletions(items, found.author);
					}
				}
			} else {
				this.logPlaintext("Manifest could not be parsed");
			}
			return items;
		}
	}
	
	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}
}