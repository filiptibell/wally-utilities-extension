import * as vscode from "vscode";

import { WallyPackageRealm } from "./base";

import { WallyManifest, WallyManifestDependency } from "./manifest";

export const findDependencyAtPosition = (
	manifest: WallyManifest,
	position: vscode.Position
): ([
	WallyPackageRealm,
	WallyManifestDependency
] | null) => {
	const allDeps: [WallyPackageRealm, WallyManifestDependency[]][] = [
		["shared", manifest.dependencies.shared],
		["server", manifest.dependencies.server],
		["dev", manifest.dependencies.dev],
	];
	for (const [dependencyRealm, dependencyList] of allDeps) {
		for (const dependency of dependencyList) {
			const deprange = new vscode.Range(dependency.start, dependency.end);
			if (deprange.contains(position)) {
				return [dependencyRealm, dependency];
			}
		}
	}
	return null;
};