import * as vscode from "vscode";





export type WallyPackageRealm = "shared" | "server" | "dev";

export type WallyPackageRealmSection = "dependencies" | "server-dependencies" | "dev-dependencies";

export type WallyGithubRegistryTree = {
	authors: Array<{
		name: string,
		sha: string,
	}>,
	config: {
		name: string,
		sha: string,
	},
};

export type WallyGithubRegistryAuthor = {
	name: string,
	sha: string,
	packages: Array<{
		name: string,
		sha: string,
	}>,
};

export type WallyGithubRegistryPackageVersion = {
	package: {
		name: string,
		version: string,
		registry: string,
		realm: WallyPackageRealm,
		description?: string,
		license?: string,
		authors: string[],
		include?: string[],
		exclude?: string[],
	},
	place?: {
		["shared-packages"]?: string,
		["server-packages"]?: string,
		["dev-packages"]?: string,
	},
	["dependencies"]: {[author: string]: string},
	["server-dependencies"]: {[author: string]: string},
	["dev-dependencies"]: {[author: string]: string},
};

export type WallyGithubRegistryPackage = {
	author: {
		name: string,
		sha: string,
	},
	// Sorted oldest-first
	versions: Array<WallyGithubRegistryPackageVersion>,
};

export type WallyGithubRegistryConfig = {
	api: string,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	github_oauth_id: string,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	fallback_registries?: string[],
};






export const isWallyManifest = (document: vscode.TextDocument) => {
	return document.fileName.endsWith("wally.toml");
};

export const getRealmCorrection = (
	currentRealm: WallyPackageRealm,
	actualPackageRealm: WallyPackageRealm
): (WallyPackageRealm | null) => {
	if (actualPackageRealm === "shared") {
		// Shared dependencies can be anywhere
	} else if (actualPackageRealm === "server") {
		// Server dependencies must not be under shared
		if (currentRealm === "shared") {
			return "server";
		}
	} else if (actualPackageRealm === "dev") {
		// Dev dependencies must not be under server
		if (currentRealm === "server") {
			return "dev";
		}
	}
	return null;
};

export const getRealmSection = (realmName: WallyPackageRealm): WallyPackageRealmSection => {
	if (realmName === "shared") {
		return "dependencies";
	} else if (realmName === "server") {
		return "server-dependencies";
	} else if (realmName === "dev") {
		return "dev-dependencies";
	}
	throw new Error("???");
};