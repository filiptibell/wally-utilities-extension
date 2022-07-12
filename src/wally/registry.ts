import axios from "axios";

import { compare as compareSemver } from "semver";

import { getGlobalLog, WallyLogHelper } from "../utils/logger";

import { GITHUB_BASE_URL, getGitHubRegistryHelper } from "./github";





type WallyApiPackageVersion = {
	package: {
		realm: string,
		version: string,
		registry: string,
	},
	["dependencies"]: {[author: string]: string},
	["server-dependencies"]: {[author: string]: string},
	["dev-dependencies"]: {[author: string]: string},
};






const getPackageVersions = async (apiUrl: string, author: string, name: string): Promise<string[] | null> => {
	const fullUrl = `${apiUrl}/v1/package-metadata/${author}/${name}`;
	const response = await axios({
		method: 'GET',
		url: fullUrl,
		responseType: 'json'
	});
	if (response.data && typeof response.data.versions === "object") {
		const versions: WallyApiPackageVersion[] = response.data.versions;
		const versionStrings = versions.map(ver => ver.package.version);
		return versionStrings.sort(compareSemver).reverse();
	}
	return null;
};





export class WallyRegistryHelper {
	private log: WallyLogHelper;
	private reg: string;
	
	constructor(registry: string) {
		this.log = getGlobalLog();
		this.reg = registry;
	}
	
	async refreshCache() {
		const hub = getGitHubRegistryHelper(this.reg);
		await hub.refreshRegistry();
	}
	
	async getPackageAuthors(): Promise<string[] | null> {
		let allNames: string[] | null = null;
		// Look at direct registry
		const hub = getGitHubRegistryHelper(this.reg);
		const authors = await hub.getAuthorNames();
		if (authors) {
			allNames = authors;
		}
		// Look at registry fallbacks
		const fallbackUrls = await hub.getRegistryFallbackUrls();
		if (fallbackUrls) {
			for (const fallbackUrl of fallbackUrls) {
				const fallbackHub = getGitHubRegistryHelper(fallbackUrl);
				const fallbackAuthors = await fallbackHub.getAuthorNames();
				if (fallbackAuthors) {
					if (!allNames) {
						allNames = fallbackAuthors;
					} else {
						allNames = [...allNames, ...fallbackAuthors];
					}
				}
			}
		}
		// Return combined results
		return allNames;
	};
	
	async getPackageNames(author: string): Promise<string[] | null> {
		// Look at direct registry
		const hub = getGitHubRegistryHelper(this.reg);
		const names = await hub.getPackageNames(author);
		if (names) {
			return names;
		}
		// Look at registry fallbacks
		const fallbackUrls = await hub.getRegistryFallbackUrls();
		if (fallbackUrls) {
			for (const fallbackUrl of fallbackUrls) {
				const fallbackHub = getGitHubRegistryHelper(fallbackUrl);
				const fallbackNames = await fallbackHub.getPackageNames(author);
				if (fallbackNames) {
					return fallbackNames;
				}
			}
		}
		// Nothing found
		return null;
	};
	
	async getPackageVersions(author: string, name: string): Promise<string[] | null> {
		// TODO: Cache package versions
		// Look at direct registry
		const hub = getGitHubRegistryHelper(this.reg);
		if (await hub.isValidPackage(author, name)) {
			const apiUrl = await hub.getRegistryApiUrl();
			if (apiUrl) {
				this.log.verboseText(`Looking for package versions in registry '${this.reg}'`);
				const versions = await getPackageVersions(apiUrl, author, name);
				if (versions && versions.length > 0) {
					return versions;
				}
			}
		}
		// Look at registry fallbacks
		const fallbackUrls = await hub.getRegistryFallbackUrls();
		if (fallbackUrls) {
			for (const fallbackUrl of fallbackUrls) {
				const fallbackHub = getGitHubRegistryHelper(fallbackUrl);
				if (await fallbackHub.isValidPackage(author, name)) {
					const fallbackApiUrl = await fallbackHub.getRegistryApiUrl();
					if (fallbackApiUrl) {
						this.log.verboseText(`Looking for package versions in registry '${fallbackUrl}'`);
						const fallbackVersions = await getPackageVersions(fallbackApiUrl, author, name);
						if (fallbackVersions && fallbackVersions.length > 0) {
							return fallbackVersions;
						}
					}
				}
			}
		}
		// Nothing found
		return null;
	};
	
	async isValidPackage(author: string, name: string): Promise<boolean | null> {
		let anyNonNulls = false;
		// Look at direct registry
		const hub = getGitHubRegistryHelper(this.reg);
		const valid = await hub.isValidPackage(author, name);
		if (valid !== null) {
			anyNonNulls = true;
			if (valid) {
				return true;
			}
		}
		// Look at registry fallbacks
		const fallbackUrls = await hub.getRegistryFallbackUrls();
		if (fallbackUrls) {
			for (const fallbackUrl of fallbackUrls) {
				const fallbackHub = getGitHubRegistryHelper(fallbackUrl);
				const fallbackValid = await fallbackHub.isValidPackage(author, name);
				if (fallbackValid !== null) {
					anyNonNulls = true;
					if (fallbackValid) {
						return true;
					}
				}
			}
		}
		// Not valid
		if (anyNonNulls) {
			return false;
		}
		// Something went wrong
		return null;
	}
}





const registries = new Map<string, WallyRegistryHelper>();

export const getRegistryHelper = (registry: string) => {
	if (!registry.startsWith(GITHUB_BASE_URL)) {
		throw new Error(`Unsupported registry: ${registry}`);
	}
	const cached = registries.get(registry);
	if (cached) {
		return cached;
	} else {
		const newRegistry = new WallyRegistryHelper(registry);
		registries.set(registry, newRegistry);
		return newRegistry;
	}
};