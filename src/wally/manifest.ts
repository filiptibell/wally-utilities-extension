import * as vscode from "vscode";

import { matchDependencyPartial } from "../utils/regex";

import { parseTomlTokens } from "../utils/toml";





export type WallyDependency = {
	hasFullAuthor: boolean,
	hasFullName: boolean,
	author: string,
	name: string,
	version: string,
	fullVersion: string,
	cleanedText: string,
	originalText: string,
	start: vscode.Position,
	end: vscode.Position,
};

export type WallyManifest = {
	name: string,
	version: string,
	realm: string,
	registry: string,
	dependencies: {
		shared: WallyDependency[],
		server: WallyDependency[],
		dev: WallyDependency[],
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

const parseDependency = (
	value: string,
	start: vscode.Position,
	end: vscode.Position
): WallyDependency => {
	const cleaned = removeStringLiteralQuotes(value);
	const partial = matchDependencyPartial(cleaned);
	const dep = {
		start,
		end,
		cleanedText: cleaned,
		originalText: value,
		...partial
	};
	return dep;
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
		name: "author/package",
		version: "0.0.0",
		realm: "shared",
		registry: "https://github.com/UpliftGames/wally-index",
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
					// Package info
					if (prevToken.text === "name") {
						manifest.name = removeStringLiteralQuotes(nextToken.text);
					} else if (prevToken.text === "version") {
						manifest.version = removeStringLiteralQuotes(nextToken.text);
					} else if (prevToken.text === "realm") {
						manifest.realm = removeStringLiteralQuotes(nextToken.text);
					} else if (prevToken.text === "registry") {
						manifest.registry = removeStringLiteralQuotes(nextToken.text);
					}
				} else {
					// Dependency
					let list: WallyDependency[] = [];
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