import * as vscode from "vscode";

import spawn from "../utils/spawn";

import { getExecutableVersion } from "../utils/cli";

let wallyCliVersion: string | undefined | null;





export const getWallyVersion = () => {
	return wallyCliVersion;
};

export const runWallyCliCommand = async (command: string, ...args: string[]) => {
	if (wallyCliVersion) {
		return await spawn("wally", [command, ...args]);
	}
	return null;
};





// Update wally version every 10 seconds, this just
// runs "wally -V" which really shouldn't be expensive
const updateWallyVersion = async () => {
	const version = await getExecutableVersion("wally");
	wallyCliVersion = version;
};

setTimeout(updateWallyVersion, 0);
setInterval(updateWallyVersion, 10_000);