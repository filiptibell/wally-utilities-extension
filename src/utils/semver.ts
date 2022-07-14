import * as semver from "semver";

const NUMBER_REGEX = new RegExp("^([0-9]+)");

const satisfies = (availableVersion: string, desiredRange: string, desiredVersion: string) => {
	if (
		availableVersion === desiredVersion
		|| semver.satisfies(availableVersion, desiredRange)
		|| semver.satisfies(availableVersion, desiredVersion)
	) {
		return true;
	}
	return false;
};

export const isSemverCompatible = (desiredVersion: string, availableVersions: string | string[]) => {
	let desiredRange = desiredVersion;
	// Starts with number(s) = no prefix, the default for
	// wally here should be highest semver compatible
	// version which is what the prefix "^" is for
	if (NUMBER_REGEX.exec(desiredVersion)) {
		desiredRange = `^${desiredVersion}`;
	}
	if (typeof availableVersions === "string") {
		if (satisfies(availableVersions, desiredRange, desiredVersion)) {
			return true;
		}
	} else if (Array.isArray(availableVersions)) {
		for (const available of availableVersions) {
			if (satisfies(available, desiredRange, desiredVersion)) {
				return true;
			}
		}
	}
	return false;
};

export const coerceSemver = (semverRange: string) => {
	return semver.coerce(semverRange)?.version || null;
};