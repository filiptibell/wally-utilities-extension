import axios from "axios";

import { compare as compareSemver } from "semver";

import { getGlobalLog, WallyLogHelper } from "../utils/logger";

import { GITHUB_BASE_URL, getRegistryGitHubHelper } from "./github";





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





export class WallyApiHelper {
	private log: WallyLogHelper;
	private reg: string;
	
	private versionCache: Map<string, Map<string, string[]>>;
	
	constructor(registry: string) {
		this.log = getGlobalLog();
		this.reg = registry;
		this.versionCache = new Map();
	}
	
	async invalidateCache() {
		this.versionCache = new Map();
	}
	
	async getPackageVersions(author: string, name: string): Promise<string[] | null> {
		// Check for cache
		let authorCache = this.versionCache.get(author);
		if (!authorCache) {
			authorCache = new Map();
			this.versionCache.set(author, authorCache);
		}
		const cachedVersions = authorCache.get(name);
		if (cachedVersions) {
			return cachedVersions;
		}
		// Look at direct registry
		const hub = getRegistryGitHubHelper(this.reg);
		if (await hub.isValidPackage(author, name)) {
			const apiUrl = await hub.getRegistryApiUrl();
			if (apiUrl) {
				this.log.verboseText(`Fetching package versions for '${author}/${name}' in registry '${this.reg}'`);
				const versions = await getPackageVersions(apiUrl, author, name);
				if (versions && versions.length > 0) {
					authorCache.set(name, versions);
					return versions;
				}
			}
		}
		// Nothing found
		return null;
	};
}





const registries = new Map<string, WallyApiHelper>();

export const getRegistryApiHelper = (registry: string) => {
	if (!registry.startsWith(GITHUB_BASE_URL)) {
		throw new Error(`Unsupported registry: ${registry}`);
	}
	const cached = registries.get(registry);
	if (cached) {
		return cached;
	} else {
		const newRegistry = new WallyApiHelper(registry);
		registries.set(registry, newRegistry);
		return newRegistry;
	}
};