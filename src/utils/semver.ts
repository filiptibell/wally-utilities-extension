export type Semver = {
	major: number,
	minor: number,
	patch: number,
	detail?: string,
};





const NUMBER_REGEX = new RegExp("^([0-9]+)");





export const parseSemver = (version: string): Semver | null => {
	let remainder = version;
	// Remove leading "v"
	if (remainder.startsWith("v")) {
		remainder = remainder.slice(1);
	}
	const extractNumber = () => {
		let result = 0;
		const matched = NUMBER_REGEX.exec(remainder);
		if (matched) {
			result = parseInt(matched[1]);
			remainder = remainder.slice(result.toString().length);
			if (remainder.startsWith(".")) {
				remainder = remainder.slice(1);
			}
		}
		return result;
	};
	// Parse versions
	let major = extractNumber();
	let minor = extractNumber();
	let patch = extractNumber();
	// Remove dash from detail
	if (remainder.startsWith("-")) {
		remainder = remainder.slice(1);
	}
	// Return full semver string info
	return {
		major,
		minor,
		patch,
		detail: remainder,
	};
};





export const isSemverCompatible = (version: string, available: string | string[]) => {
	if (typeof available === "string") {
		const vsemver = parseSemver(version);
		const asemver = parseSemver(available);
		if (vsemver && asemver) {
			// Differing major versions are never compatible
			if (vsemver.major !== asemver.major) {
				return false;
			}
			// Differing minor versions are not compatible when major version is 0
			if (vsemver.major === 0) {
				if (vsemver.minor !== asemver.minor) {
					return false;
				}
			}
			// Given version must always be lower than the available version
			if (vsemver.minor > asemver.minor) {
				return false;
			}
			if (vsemver.minor === asemver.minor) {
				if (vsemver.patch > asemver.patch) {
					return false;
				}
			}
			// Otherwise, versions are always compatible
			return true;
		}
	} else if (Array.isArray(available)) {
		for (const other of available) {
			if (isSemverCompatible(version, other)) {
				return true;
			}
		}
	}
	return false;
};