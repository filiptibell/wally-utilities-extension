/* eslint-disable @typescript-eslint/naming-convention */

import { Octokit } from "@octokit/rest";

import { GITHUB_BASE_URL } from "../utils/constants";

import { getGlobalLog, WallyLogHelper } from "../utils/logger";





const USER_REPO_REGEX = new RegExp("([a-zA-Z\-]+)\/([a-zA-Z\-]+)");





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

type WallyGithubRegistryConfig = {
	api: string,
	github_oauth_id: string,
	fallback_registries?: string[],
};

export class WallyGithubHelper {
	private registryUser: string | null;
	private registryRepo: string | null;
	
	private tree: WallyGithubRegistryTree | null;
	private config: WallyGithubRegistryConfig | null;
	private nameCache: Map<string, string[]>;
	
	private log: WallyLogHelper;
	private kit: Octokit;
	private tok: string | null;
	
	constructor(registry: string, authToken: string | null) {
		// Parse out user and repo from registry string
		if (registry.startsWith(GITHUB_BASE_URL)) {
			const stripped = registry.slice(GITHUB_BASE_URL.length);
			const matches = USER_REPO_REGEX.exec(stripped);
			if (matches) {
				this.registryUser = matches[1];
				this.registryRepo = matches[2];
			} else {
				throw new Error(`Invalid registry: ${registry}`);
			}
		} else {
			throw new Error(`Unsupported registry: ${registry}`);
		}
		this.tree = null;
		this.config = null;
		this.nameCache = new Map();
		this.log = getGlobalLog();
		this.kit = new Octokit({
			auth: authToken,
		});
		this.tok = authToken;
		this.invalidateCache();
	}
	
	private async getRegistryTree(): Promise<WallyGithubRegistryTree | null> {
		if (this.registryUser && this.registryRepo) {
			// Check for cached tree
			if (this.tree) {
				return this.tree;
			}
			// Fetch tree from github
			this.log.normalText(`Fetching registry tree for '${this.registryUser}/${this.registryRepo}'`);
			const treeResponse = await this.kit.git.getTree({
				owner: this.registryUser,
				repo: this.registryRepo,
				tree_sha: "main",
			});
			if (treeResponse.status === 200) {
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
			this.log.normalText("Failed to fetch registry tree");
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
			const fileResponse = await this.kit.git.getBlob({
				owner: this.registryUser,
				repo: this.registryRepo,
				file_sha: tree.config.sha,
			});
			if (fileResponse.status === 200) {
				const contents = Buffer.from(fileResponse.data.content, "base64");
				const config = JSON.parse(contents.toString());
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
		this.nameCache = new Map();
		await this.getRegistryConfig();
	}
	
	async setAuthToken(token: string | null) {
		if (this.tok !== token) {
			this.tok = token;
			this.kit = new Octokit({
				auth: token,
			});
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
	
	async getPackageNames(author: string): Promise<string[] | null> {
		// Check for cached names
		const cached = this.nameCache.get(author);
		if (cached) {
			return cached;
		}
		// Nothing cached, perform the request
		const tree = await this.getRegistryTree();
		if (tree && this.registryUser && this.registryRepo) {
			// Find author ref from authors list
			let authorSHA: string = "";
			const lowered = author.toLowerCase();
			for (const author of tree.authors) {
				if (author.name === lowered) {
					authorSHA = author.sha;
					break;
				}
			}
			if (authorSHA.length > 0) {
				// Fetch package names
				const treeResponse = await this.kit.git.getTree({
					owner: this.registryUser,
					repo: this.registryRepo,
					tree_sha: authorSHA,
				});
				if (treeResponse.status === 200) {
					const packageNames: string[] = [];
					for (const item of treeResponse.data.tree) {
						if (item.path && item.type !== "tree") {
							if (item.path !== "owners.json") {
								packageNames.push(item.path);
							}
						}
					}
					this.nameCache.set(author, packageNames);
					return packageNames;
				}
			}
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





const helpers = new Map<string, WallyGithubHelper>();

let authToken: string | null = null;

export const getRegistryGitHubHelper = (registry: string) => {
	const cached = helpers.get(registry);
	if (cached) {
		return cached;
	} else {
		const newHelper = new WallyGithubHelper(registry, authToken);
		helpers.set(registry, newHelper);
		return newHelper;
	}
};

export const setGitHubAuthToken = (token: string | null) => {
	if (authToken !== token) {
		authToken = token;
		for (const [_, registry] of helpers) {
			registry.setAuthToken(token);
		}
	}
};