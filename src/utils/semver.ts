import * as semver from "semver";

const NUMBER_REGEX = new RegExp("^([0-9]+)");

export const isSemverCompatible = (desiredVersion: string, availableVersions: string | string[]) => {
	let desiredRange = desiredVersion;
	// Starts with number(s) = no prefix, the default for
	// wally here should be highest semver compatible
	// version which is what the prefix "^" is for
	if (NUMBER_REGEX.exec(desiredVersion)) {
		desiredRange = `^${desiredVersion}`;
	}
	if (typeof availableVersions === "string") {
		return semver.satisfies(availableVersions, desiredRange);
	} else if (Array.isArray(availableVersions)) {
		for (const available of availableVersions) {
			if (semver.satisfies(available, desiredRange)) {
				return true;
			}
		}
	}
};