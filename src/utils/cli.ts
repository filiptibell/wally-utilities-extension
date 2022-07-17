import pMemoize from "p-memoize";

import spawn, { ChildProcessRejection } from "./spawn";

import { isValidSemver } from "./semver";





export const getExecutableVersion = pMemoize(async (executableName: string) => {
	return await (
		spawn(executableName, ["-V"])
			.then((result: string) => {
				const stripped = result.startsWith(executableName) ? result.slice(executableName.length).trim() : result;
				return isValidSemver(stripped) ? stripped : undefined;
			})
			.catch((_: ChildProcessRejection) => {
				return null;
			})
	);
});