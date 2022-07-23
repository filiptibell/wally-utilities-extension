import * as vscode from "vscode";

import { matchDependencyPartial } from "../utils/matching";

import { parseTomlTokens } from "../utils/toml";

import { WallyPackageRealm } from "./base";





export type WallyManifestKeyValue = {
	mock: boolean,
	keyName: string,
	cleanedText: string,
	originalText: string,
	originalStart: vscode.Position,
	originalEnd: vscode.Position,
	start: vscode.Position,
	end: vscode.Position,
};

export type WallyManifestDependency = WallyManifestKeyValue & {
	hasFullAuthor: boolean,
	hasFullName: boolean,
	author: string,
	name: string,
	version: string,
	fullVersion: string,
};

export type WallyManifest = {
	package: {
		name: WallyManifestKeyValue,
		version: WallyManifestKeyValue,
		realm: WallyManifestKeyValue,
		registry: WallyManifestKeyValue,
	},
	dependencies: {
		shared: WallyManifestDependency[],
		server: WallyManifestDependency[],
		dev: WallyManifestDependency[],
	},
};





const removeStringLiteralQuotes = (str: string): string => {
	const first = str.charAt(0);
	const last = str.charAt(str.length - 1);
	return str.slice(
		(first === '"' || first === "'") ? 1 : 0,
		(last === '"' || last === "'") ? str.length - 1 : str.length
	);
};

const mockKeyValueAssignment = (): WallyManifestKeyValue => {
	const assignment = {
		mock: true,
		start: new vscode.Position(0, 0),
		end: new vscode.Position(0, 0),
		keyName: "",
		cleanedText: "",
		originalText: "",
		originalStart: new vscode.Position(0, 0),
		originalEnd: new vscode.Position(0, 0),
	};
	return assignment;
};

const parseKeyValueAssignment = (
	key: string,
	value: string,
	start: vscode.Position,
	end: vscode.Position
): WallyManifestKeyValue => {
	const cleaned = removeStringLiteralQuotes(value);
	const assignment = {
		mock: false,
		start,
		end,
		keyName: key,
		cleanedText: cleaned,
		originalText: value,
		originalStart: new vscode.Position(end.line, end.character - value.length),
		originalEnd: end,
	};
	return assignment;
};

const parseDependency = (
	key: string,
	value: string,
	start: vscode.Position,
	end: vscode.Position
): WallyManifestDependency => {
	const assignment = parseKeyValueAssignment(key, value, start, end);
	return {...assignment, ...matchDependencyPartial(assignment.cleanedText)};
};





export const parseWallyManifest = (document: vscode.TextDocument) => {
	// Try to parse toml tokens from text document
	const result = parseTomlTokens(document);
	if (result.errors && result.errors.length > 0) {
		return null;
	}
	if (!result.tokens || result.tokens.length <= 0) {
		return null;
	}
	// Create manifest info
	const manifest: WallyManifest = {
		package: {
			name: mockKeyValueAssignment(),
			version: mockKeyValueAssignment(),
			realm: mockKeyValueAssignment(),
			registry: mockKeyValueAssignment(),
		},
		dependencies: {
			shared: [],
			server: [],
			dev: [],
		},
	};
	// Filter out space / comment tokens
	const toks = result.tokens.filter(tok => {
		if (
			tok.simp === "Whitespace"
			|| tok.simp === "Newline"
			|| tok.simp === "Comment"
		) {
			return false;
		};
		return true;
	});
	// Go through all toml tokens and fill
	// wally manifest info with real data
	let currentLabel: string = "";
	for (const [index, token] of toks.entries()) {
		const prevToken = toks[index - 1];
		const nextToken = toks[index + 1];
		if (prevToken && nextToken) {
			if (
				// Label such as [package] or [dependencies]
				token.kind === "UnquotedKey"
				&& prevToken.simp === "LSquare"
				&& nextToken.simp === "RSquare"
			) {
				currentLabel = token.text;
			} else if (
				// Some string assignment like key = "value"
				token.simp === "KeyValSep"
				&& prevToken.simp === "Key"
				&& nextToken.simp === "String"
			) {
				if (currentLabel === "package") {
					// Package info field
					let packageKey: keyof WallyManifest["package"] | undefined;
					if (
						prevToken.text === "name"
						|| prevToken.text === "version"
						|| prevToken.text === "realm"
						|| prevToken.text === "registry"
					) {
						packageKey = prevToken.text;
					}
					if (packageKey) {
						manifest.package[packageKey] = parseKeyValueAssignment(
							prevToken.text,
							nextToken.text,
							prevToken.start,
							nextToken.end,
						);
					}
				} else {
					// Dependency
					let list: WallyManifestDependency[] = [];
					if (currentLabel === "dependencies") {
						list = manifest.dependencies.shared;
					} else if (currentLabel === "server-dependencies") {
						list = manifest.dependencies.server;
					} else if (currentLabel === "dev-dependencies") {
						list = manifest.dependencies.dev;
					} else {
						continue;
					}
					list.push(parseDependency(
						prevToken.text,
						nextToken.text,
						prevToken.start,
						nextToken.end,
					));
				}
					
			}
		}
	}
	return manifest;
};

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
