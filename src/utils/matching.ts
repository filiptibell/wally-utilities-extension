import { coerceSemver } from "./semver";

import { get as getLevenDistance } from "fast-levenshtein";

export type DependencyPartial = {
	author: string,
	name: string,
	version: string,
	fullVersion: string,
	hasFullAuthor: boolean,
	hasFullName: boolean,
};

const WORD_PATTERN = "([a-zA-Z]+?[a-zA-Z0-9\-]+)";

const VERSION_PATTERN = "([\d\.\-a-zA-Z]+)$";

const SEPARATOR_WORD = "\/";
const SEPARATOR_VERSION = "@";

const REGEX_WORD = new RegExp("^" + WORD_PATTERN);
const REGEX_SEPARATED_WORDS = new RegExp("^" + WORD_PATTERN + SEPARATOR_WORD + WORD_PATTERN);
const REGEX_VERSION_STRICT = new RegExp(VERSION_PATTERN);





const matchTwoWords = (str: string) => {
	const result = REGEX_SEPARATED_WORDS.exec(str);
	if (result) {
		return result.slice(1);
	}
	return null;
};

export const matchUserAndRepo = matchTwoWords;
export const matchAuthorAndPackage = matchTwoWords;

export const matchAuthor = (str: string) => {
	const result = REGEX_WORD.exec(str);
	if (result) {
		return result[1];
	}
	return null;
};

export const matchVersion = (str: string) => {
	const result = REGEX_VERSION_STRICT.exec(str);
	if (result) {
		return result[1];
	}
	return null;
};





export const matchDependencyPartial = (str: string): DependencyPartial => {
	const result: DependencyPartial = {
		author: "",
		name: "",
		version: "",
		fullVersion: "",
		hasFullAuthor: false,
		hasFullName: false,
	};
	const firstWord = REGEX_WORD.exec(str);
	if (firstWord) {
		const foundAuthor = firstWord[1];
		result.author = foundAuthor;
		result.hasFullAuthor = str.charAt(foundAuthor.length) === SEPARATOR_WORD;
		if (result.hasFullAuthor) {
			const afterFirst = str.slice(foundAuthor.length + 1);
			const secondWord = REGEX_WORD.exec(afterFirst);
			if (secondWord) {
				const foundName = secondWord[1];
				result.name = foundName;
				result.hasFullName = str.charAt(foundAuthor.length + 1 + foundName.length) === SEPARATOR_VERSION;
				if (result.hasFullName) {
					const afterSecond = str.slice(foundAuthor.length + 1 + foundName.length + 1);
					result.fullVersion = afterSecond;
					result.version = coerceSemver(afterSecond) || "";
				}
			}
		}
	}
	return result;
};

export const matchFullDependency = (str: string) => {
	const result = matchDependencyPartial(str);
	if (result) {
		if (
			result.author
			&& result.name
			&& result.version
		) {
			return [
				result.author,
				result.name,
				result.version,
			];
		}
	}
	return null;
};





export const matchClosestOption = (input: string, options: string[], defaultValue: string): string => {
	if (input.length > 0) {
		// Check starting chars first because it is usually more accurate
		const lowered = input.toLowerCase();
		for (const option of options) {
			const minLen = Math.min(
				input.length,
				option.length,
			);
			if (
				lowered.slice(0, minLen)
				=== option.slice(0, minLen)
			) {
				return option;
			}
		}
		// Fallback to levenshtein distance for misspelling
		const sorted = options.sort((a, b) => {
			const da = getLevenDistance(a, input);
			const db = getLevenDistance(b, input);
			if (da > db) {
				return 1;
			} else if (da < db) {
				return -1;
			} else {
				return 0;
			}
		});
		return sorted[0];
	}
	return defaultValue;
};

export const getMatchDistance = (a: string, b: string): number => {
	const distance = getLevenDistance(a, b);
	const longest = Math.max(a.length, b.length);
	return Math.max(0, Math.min(distance / longest, 1));
};