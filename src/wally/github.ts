import * as vscode from "vscode";

import { Octokit } from "@octokit/rest";

import { RequestError } from "@octokit/request-error";

import { GITHUB_BASE_URL } from "../utils/constants";

import { getGlobalLog, WallyLogHelper } from "../utils/logger";

import { matchUserAndRepo } from "../utils/regex";





const ERROR_MESSAGE_TICKS = new Map<string, number>();

const ERROR_MESSAGE_COOLDOWN = 4;

const ERROR_MESSAGE_TOO_MANY_REQUESTS = `
Wally has reached the allowed request limit for GitHub.

You can set a personal access token in the settings for the Wally extension to raise the request limit.
`;

const ERROR_MESSAGE_NOT_FOUND = `
Wally was unable to find a package registry at 'https://github.com/<REGISTRY_NAME>'.

If you are trying to use a private Wally registry, you can fix this error by setting a personal access token in the settings for the Wally extension.
`;

const tryErrorMessage = (message: string): boolean => {
	const now = new Date().getTime() / 1000;
	const last = ERROR_MESSAGE_TICKS.get(message) ?? 0;
	if ((now - last) >= ERROR_MESSAGE_COOLDOWN) {
		ERROR_MESSAGE_TICKS.set(message, now);
		return true;
	}
	return false;
};










type WallyGithubRegistryTree = {
	authors: Array<{
		name: string,
		sha: string,
	}>,
	config: {
		name: string,
		sha: string,
	},
};

type WallyGithubRegistryAuthor = {
	name: string,
	sha: string,
	packages: Array<{
		name: string,
		sha: string,
	}>,
};

type WallyGithubRegistryPackageVersion = {
	package: {
		name: string,
		version: string,
		registry: string,
		realm: string,
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

type WallyGithubRegistryPackage = {
	author: {
		name: string,
		sha: string,
	},
	// Sorted oldest-first
	versions: Array<WallyGithubRegistryPackageVersion>,
};

type WallyGithubRegistryConfig = {
	api: string,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	github_oauth_id: string,
	// eslint-disable-next-line @typescript-eslint/naming-convention
	fallback_registries?: string[],
};











export class WallyGithubHelper {
	
	private registryUser: string | null;
	private registryRepo: string | null;
	
	private tree: WallyGithubRegistryTree | null;
	private config: WallyGithubRegistryConfig | null;
	
	private authorCache: Map<string, WallyGithubRegistryAuthor>;
	private packageCache: Map<string, Map<string, WallyGithubRegistryPackage>>;
	
	private log: WallyLogHelper;
	private kit: Octokit;
	private tok: string | null;
	
	
	
	
	
	constructOctokit() {
		return new Octokit({
			auth: this.tok,
			log: {
				debug: () => { },
				info: () => { },
				warn: (message) => { this.log.verboseText(`[OCTOKIT] ${message}`); },
				error: (message) => { this.log.normalText(`[OCTOKIT] ${message}`); }
			}
		});
	}
	
	constructor(registry: string, authToken: string | null) {
		// Parse out user and repo from registry string
		if (registry.startsWith(GITHUB_BASE_URL)) {
			const stripped = registry.slice(GITHUB_BASE_URL.length);
			const matches = matchUserAndRepo(stripped);
			if (matches) {
				this.registryUser = matches[0];
				this.registryRepo = matches[1];
			} else {
				throw new Error(`Invalid registry: ${registry}`);
			}
		} else {
			throw new Error(`Unsupported registry: ${registry}`);
		}
		this.tree = null;
		this.config = null;
		this.authorCache = new Map();
		this.packageCache = new Map();
		this.log = getGlobalLog();
		this.tok = authToken;
		this.kit = this.constructOctokit();
		this.invalidateCache();
	}
	
	
	
	
	
	private handleUnhandledError(message: string) {
		this.log.normalText(`GitHub request failed: '${message}'`);
		if (tryErrorMessage(message)) {
			vscode.window.showErrorMessage(`An unhandled error occurred for the Wally extension. This is a bug. Please report it: ${message}`);
		}
	}
	
	private handleGitHubErrorStatus(status: number, message?: string) {
		if (message) {
			this.log.normalText(`GitHub request failed: ${status} '${message}'`);
		} else {
			this.log.normalText(`GitHub request failed: ${status}`);
		}
		if (status === 403) {
			// Too many requests :(
			if (tryErrorMessage(ERROR_MESSAGE_TOO_MANY_REQUESTS)) {
				vscode.window.showErrorMessage(ERROR_MESSAGE_TOO_MANY_REQUESTS, {}, "Open Settings").then(clicked => {
					if (clicked) {
						vscode.commands.executeCommand(
							'workbench.action.openSettings',
							'wally.auth.token'
						);
					}
				});
			}
		} else if (status === 404) {
			const regString = `${this.registryUser}/${this.registryRepo}`;
			if (regString === "UpliftGames/wally-index") {
				// This should never happen, but just in case,
				// we shouldn't warn saying that the public wally
				// index might be a private registry like we do below
				return;
			}
			// Index not found, might be private
			if (tryErrorMessage(ERROR_MESSAGE_NOT_FOUND)) {
				const withReg = ERROR_MESSAGE_NOT_FOUND.replace("<REGISTRY_NAME>", regString);
				vscode.window.showErrorMessage(withReg, {}, "Open Settings").then(clicked => {
					if (clicked) {
						vscode.commands.executeCommand(
							'workbench.action.openSettings',
							'wally.auth.token'
						);
					}
				});
			}
		}
	}
	
	private async getGitHubTree(sha: string) {
		if (this.registryUser && this.registryRepo) {
			return this.kit.git.getTree({
				owner: this.registryUser,
				repo: this.registryRepo,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				tree_sha: sha,
			}).then(res => {
				if (res.status === 200) {
					return res;
				} else {
					this.handleGitHubErrorStatus(res.status);
					return null;
				}
			}).catch((err: RequestError) => {
				this.handleGitHubErrorStatus(err.status);
				return null;
			});
		}
		return null;
	}
	
	private async getGitHubBlob(sha: string) {
		if (this.registryUser && this.registryRepo) {
			return this.kit.git.getBlob({
				owner: this.registryUser,
				repo: this.registryRepo,
				// eslint-disable-next-line @typescript-eslint/naming-convention
				file_sha: sha,
			}).then(res => {
				if (res.status === 200) {
					if (res.data.encoding === "base64") {
						const buf = Buffer.from(res.data.content, "base64");
						return buf.toString();
					} else {
						this.handleUnhandledError(`Encountered unknown encoding scheme ${res.data.encoding} in GitHub blob`);
						return null;
					}
				} else {
					this.handleGitHubErrorStatus(res.status);
					return null;
				}
			}).catch((err: RequestError) => {
				this.handleGitHubErrorStatus(err.status);
				return null;
			});
		}
		return null;
	}
	
	
	
	
	
	private async getRegistryTree(): Promise<WallyGithubRegistryTree | null> {
		if (this.registryUser && this.registryRepo) {
			// Check for cached tree
			if (this.tree) {
				return this.tree;
			}
			// Fetch tree from github
			this.log.normalText(`Fetching registry tree for '${this.registryUser}/${this.registryRepo}'`);
			const treeResponse = await this.getGitHubTree("main");
			if (treeResponse) {
				// Create new tree info
				const tree = {
					authors: new Array<{
						name: string,
						sha: string,
					}>,
					config: {
						name: "",
						sha: "",
					}
				};
				// Fill with authors & config file
				for (const item of treeResponse.data.tree) {
					if (
						typeof item.path === "string" &&
						typeof item.sha === "string"
					) {
						if (item.type === "tree") {
							tree.authors.push({
								name: item.path,
								sha: item.sha,
							});
						} else if (item.path.endsWith(".json")) {
							tree.config.name = item.path;
							tree.config.sha = item.sha;
						}
					}
				}
				// Set cache & return new tree
				this.tree = tree;
				return tree;
			}
		}
		return null;
	}
	
	private async getRegistryAuthor(authorName: string): Promise<WallyGithubRegistryAuthor | null> {
		// Check for cached authors
		const lowered = authorName.toLowerCase();
		const cached = this.authorCache.get(lowered);
		if (cached) {
			return cached;
		}
		// Nothing cached, perform the request
		const tree = await this.getRegistryTree();
		if (tree && this.registryUser && this.registryRepo) {
			// Find author ref from authors list
			let authorSHA: string = "";
			for (const author of tree.authors) {
				if (author.name === lowered) {
					authorSHA = author.sha;
					break;
				}
			}
			if (authorSHA.length > 0) {
				// Fetch package names
				const treeResponse = await this.getGitHubTree(authorSHA);
				if (treeResponse) {
					const author: WallyGithubRegistryAuthor = {
						name: lowered,
						sha: authorSHA,
						packages: []
					};
					for (const item of treeResponse.data.tree) {
						if (item.path && item.sha && item.type !== "tree") {
							if (item.path !== "owners.json") {
								author.packages.push({
									name: item.path,
									sha: item.sha,
								});
							}
						}
					}
					this.authorCache.set(lowered, author);
					return author;
				}
			}
		}
		return null;
	}
	
	private async getRegistryPackage(authorName: string, packageName: string): Promise<WallyGithubRegistryPackage | null> {
		// Check for cached packages
		const loweredAuthor = authorName.toLowerCase();
		let cachedAuthor = this.packageCache.get(loweredAuthor);
		if (!cachedAuthor) {
			cachedAuthor = new Map();
			this.packageCache.set(loweredAuthor, cachedAuthor);
		}
		const loweredPackage = packageName.toLowerCase();
		const cachedPackage = cachedAuthor.get(loweredPackage);
		if (cachedPackage) {
			return cachedPackage;
		}
		// Nothing cached, perform the request
		const author = await this.getRegistryAuthor(authorName);
		if (author && this.registryUser && this.registryRepo) {
			// Find the sha for this file
			let packageSHA = "";
			for (const pack of author.packages) {
				if (pack.name === loweredPackage) {
					packageSHA = pack.sha;
					break;
				}
			}
			if (packageSHA && packageSHA.length > 0) {
				// Fetch package contents blob from tree
				this.log.verboseText(`Fetching package blob for '${loweredAuthor}/${loweredPackage}' in '${this.registryUser}/${this.registryRepo}'`);
				const blob = await this.getGitHubBlob(packageSHA);
				if (blob) {
					// Parse each line as a package version object, oldest first
					const versions: WallyGithubRegistryPackageVersion[] = [];
					for (const line of blob.split("\n")) {
						const trimmed = line.trim();
						if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
							versions.push(JSON.parse(trimmed));
						}
					}
					// Create and return full package info
					const pack: WallyGithubRegistryPackage = {
						author: {
							name: loweredAuthor,
							sha: author.sha,
						},
						versions,
					};
					cachedAuthor.set(loweredPackage, pack);
					return pack;
				}
			}
		}
		return null;
	}
	
	private async getRegistryConfig(): Promise<WallyGithubRegistryConfig | null> {
		const tree = await this.getRegistryTree();
		if (tree && this.registryUser && this.registryRepo) {
			// Check for cached config
			if (this.config) {
				return this.config;
			}
			// Fetch config contents blob from tree
			this.log.verboseText(`Fetching registry config for '${this.registryUser}/${this.registryRepo}'`);
			const blob = await this.getGitHubBlob(tree.config.sha);
			if (blob) {
				const config = JSON.parse(blob);
				this.config = config;
				this.log.normalText(`Got registry config for '${this.registryUser}/${this.registryRepo}':`);
				this.log.normalJson(config);
				return config;
			}
		}
		return null;
	}
	
	
	
	
	
	async invalidateCache() {
		this.tree = null;
		this.config = null;
		this.authorCache = new Map();
		this.packageCache = new Map();
		await this.getRegistryConfig();
	}
	
	async setAuthToken(token: string | null) {
		// TODO: Maybe we should be using device flow authentication instead
		// of personal access tokens and have a nice integrated popup for it
		if (this.tok !== token) {
			this.tok = token;
			this.kit = this.constructOctokit();
			this.log.verboseText("Changed GitHub auth token");
			await this.invalidateCache();
		}
	}
	
	async getAuthorNames(): Promise<string[] | null> {
		const tree = await this.getRegistryTree();
		if (tree) {
			const authorNames: string[] = [];
			for (const author of tree.authors) {
				authorNames.push(author.name);
			}
			return authorNames;
		}
		return null;
	}
	
	async getPackageNames(authorName: string): Promise<string[] | null> {
		const author = await this.getRegistryAuthor(authorName);
		if (author) {
			return author.packages.map(pack => pack.name);
		}
		return null;
	}
	
	async getPackageVersions(authorName: string, packageName: string): Promise<string[] | null> {
		const pack = await this.getRegistryPackage(authorName, packageName);
		if (pack) {
			return pack.versions.map(ver => ver.package.version).reverse();
		}
		return null;
	}
	
	async getRegistryApiUrl(): Promise<string | null> {
		const config = await this.getRegistryConfig();
		if (config) {
			return config.api;
		}
		return null;
	}
	
	async getRegistryFallbackUrls(): Promise<string[] | null> {
		const config = await this.getRegistryConfig();
		if (config && config.fallback_registries) {
			return config.fallback_registries;
		}
		return null;
	}
	
	async isValidAuthor(author: string): Promise<boolean | null> {
		const authors = await this.getAuthorNames();
		if (authors) {
			return authors.includes(author);
		}
		return null;
	}
	
	async isValidPackage(author: string, name: string): Promise<boolean | null> {
		const names = await this.getPackageNames(author);
		if (names) {
			return names.includes(name);
		}
		return null;
	}
}










const hubs = new Map<string, WallyGithubHelper>();

let authToken: string | null = null;

export const getRegistryGitHubHelper = (registry: string) => {
	const cached = hubs.get(registry);
	if (cached) {
		return cached;
	} else {
		const newHub = new WallyGithubHelper(registry, authToken);
		hubs.set(registry, newHub);
		return newHub;
	}
};

export const setGitHubAuthToken = (token: string | null) => {
	if (authToken !== token) {
		authToken = token;
		for (const [_, hub] of hubs) {
			hub.setAuthToken(token);
		}
	}
};