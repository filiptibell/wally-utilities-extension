import { GITHUB_BASE_URL, getRegistryGitHubHelper } from "./github";

import { getRegistryApiHelper } from "./api";





export class WallyRegistryHelper {
	private reg: string;
	
	constructor(registry: string) {
		this.reg = registry;
	}
	
	async invalidateCache() {
		const hub = getRegistryGitHubHelper(this.reg);
		const api = getRegistryApiHelper(this.reg);
		await Promise.all([
			hub.invalidateCache(),
			api.invalidateCache(),
		]);
	}
	
	async getPackageAuthors(): Promise<string[] | null> {
		let allNames: string[] | null = null;
		// Look at direct registry
		const hub = getRegistryGitHubHelper(this.reg);
		const authors = await hub.getAuthorNames();
		if (authors) {
			allNames = authors;
		}
		// Look at registry fallbacks
		const fallbackUrls = await hub.getRegistryFallbackUrls();
		if (fallbackUrls) {
			for (const fallbackUrl of fallbackUrls) {
				const fallbackHub = getRegistryGitHubHelper(fallbackUrl);
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
		const hub = getRegistryGitHubHelper(this.reg);
		const names = await hub.getPackageNames(author);
		if (names) {
			return names;
		}
		// Look at registry fallbacks
		const fallbackUrls = await hub.getRegistryFallbackUrls();
		if (fallbackUrls) {
			for (const fallbackUrl of fallbackUrls) {
				const fallbackHub = getRegistryGitHubHelper(fallbackUrl);
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
		// Look at direct registry
		const api = getRegistryApiHelper(this.reg);
		const versions = await api.getPackageVersions(author, name);
		if (versions) {
			return versions;
		}
		// Look at registry fallbacks
		const hub = getRegistryGitHubHelper(this.reg);
		const fallbackUrls = await hub.getRegistryFallbackUrls();
		if (fallbackUrls) {
			for (const fallbackUrl of fallbackUrls) {
				const fallbackApi = getRegistryApiHelper(fallbackUrl);
				const fallbackVersions = await fallbackApi.getPackageVersions(author, name);
				if (fallbackVersions) {
					return fallbackVersions;
				}
			}
		}
		// Nothing found
		return null;
	};
	
	async isValidAuthor(author: string): Promise<boolean | null> {
		let anyNonNulls = false;
		// Look at direct registry
		const hub = getRegistryGitHubHelper(this.reg);
		const valid = await hub.isValidAuthor(author);
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
				const fallbackHub = getRegistryGitHubHelper(fallbackUrl);
				const fallbackValid = await fallbackHub.isValidAuthor(author);
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
	
	async isValidPackage(author: string, name: string): Promise<boolean | null> {
		let anyNonNulls = false;
		// Look at direct registry
		const hub = getRegistryGitHubHelper(this.reg);
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
				const fallbackHub = getRegistryGitHubHelper(fallbackUrl);
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