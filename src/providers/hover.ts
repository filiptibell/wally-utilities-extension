import * as vscode from "vscode";
import { PUBLIC_REGISTRY_URL } from "../utils/constants";

import { getGlobalLog, WallyLogHelper } from "../utils/logger";
import { matchAuthorAndPackage } from "../utils/matching";

import { isWallyManifest } from "../wally/base";

import { parseWallyManifest, WallyManifestDependency } from "../wally/manifest";

import { getRegistryHelper, WallyRegistryHelper } from "../wally/registry";






export const WALLY_HOVER_SELECTOR = {
	language: "toml",
	scheme: "file"
};





export class WallyHoverProvider implements vscode.HoverProvider {
	private log: WallyLogHelper;
	
	private enabled: boolean;
	
	constructor() {
		this.log = getGlobalLog();
		this.enabled = true;
	}
	
	async provideDependencyHover(registry: WallyRegistryHelper, dependency: WallyManifestDependency) {
		if (
			dependency.hasFullAuthor
			&& dependency.hasFullName
			&& dependency.version.length >= 0
		) {
			const latestCompatible = await registry.getLatestSemverCompatibleVersion(
				dependency.author,
				dependency.name,
				dependency.fullVersion
			);
			if (latestCompatible) {
				const latestInfo = await registry.getFullPackageInfo(
					dependency.author,
					dependency.name,
					dependency.fullVersion
				);
				if (latestInfo) {
					let mkdown = new vscode.MarkdownString();
					const matched = matchAuthorAndPackage(latestInfo.package.name);
					if (matched) {
						const [packageAuthor, packageName] = matched;
						mkdown.appendMarkdown(`\n# ${packageName}`);
						mkdown.appendMarkdown(`\n*by ${packageAuthor}*`);
					} else {
						mkdown.appendMarkdown(`\n# ${latestInfo.package.name}`);
					}
					if (latestInfo.package.description) {
						mkdown.appendMarkdown(`\n\n${latestInfo.package.description}`);
					}
					if (latestInfo.package.registry.toLowerCase() === PUBLIC_REGISTRY_URL) {
						const link = `https://wally.run/package/${latestInfo.package.name}`;
						mkdown.appendMarkdown(`\n\n[View on wally.run](${link})`);
					}
					const hov = new vscode.Hover(mkdown);
					hov.range = new vscode.Range(
						dependency.start,
						dependency.end
					);
					return hov;
				}
			}
		}
		return null;
	}
	
	async provideHover(document: vscode.TextDocument, position: vscode.Position) {
		// Make sure completion is enabled
		if (!this.enabled) {
			this.log.verboseText("Hover is not enabled");
			return null;
		}
		// Check if this toml file is a wally manifest
		if (isWallyManifest(document)) {
			// Try to parse this wally manifest file
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
				// Provide hover for the found dependency
				if (found) {
					const registryUrl = manifest.package.registry.cleanedText;
					const registry = getRegistryHelper(registryUrl);
					return await this.provideDependencyHover(registry, found);
				}
			} else {
				this.log.normalText("Manifest could not be parsed");
			}
		}
		return null;
	}
	
	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}
}