import * as vscode from "vscode";

import { parseTomlTokens } from "./toml";





export type WallyDependency = {
	hasFullAuthor: boolean,
	hasFullName: boolean,
	author: string,
	name: string,
	version: string,
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





const DEPENDENCY_REGEX_WORD = new RegExp("([a-zA-Z\-]+)");
const DEPENDENCY_REGEX_VERSION = new RegExp("([\d\.\-a-zA-Z]+)");

const parseDependency = (
	value: string,
	start: vscode.Position,
	end: vscode.Position
): WallyDependency => {
	const dep = {
		hasFullAuthor: false,
		hasFullName: false,
		author: "",
		name: "",
		version: "",
		start,
		end,
	};
	const firstWord = DEPENDENCY_REGEX_WORD.exec(value);
	if (firstWord) {
		const foundAuthor = firstWord[1];
		dep.author = foundAuthor;
		dep.hasFullAuthor = value.charAt(foundAuthor.length + 1) === '/';
		if (dep.hasFullAuthor) {
			const afterFirst = value.slice(foundAuthor.length + 2);
			const secondWord = DEPENDENCY_REGEX_WORD.exec(afterFirst);
			if (secondWord) {
				const foundName = secondWord[1];
				dep.name = foundName;
				dep.hasFullName = value.charAt(foundAuthor.length + foundName.length + 2) === '@';
				if (dep.hasFullName) {
					const afterSecond = value.slice(foundAuthor.length + foundName.length + 3);
					const versionIden = DEPENDENCY_REGEX_VERSION.exec(afterSecond);
					if (versionIden) {
						dep.version = versionIden[1];
					}
				}
			}
		}
	}
	return dep;
};

const fixStringQuotes = (str: string): string => {
	const first = str.charAt(0);
	const last = str.charAt(str.length - 1);
	return str.slice(
		(first === '"' || first === "'") ? 1 : 0,
		(last === '"' || last === "'") ? str.length - 1 : str.length
	);
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
						manifest.name = fixStringQuotes(nextToken.text);
					} else if (prevToken.text === "version") {
						manifest.version = fixStringQuotes(nextToken.text);
					} else if (prevToken.text === "realm") {
						manifest.realm = fixStringQuotes(nextToken.text);
					} else if (prevToken.text === "registry") {
						manifest.registry = fixStringQuotes(nextToken.text);
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