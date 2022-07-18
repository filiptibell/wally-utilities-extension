import * as vscode from "vscode";

import { isSemverCompatible } from "../utils/semver";

const PACKAGE_INDEX_FOLDERS = new Set([
	"Packages/_Index/",
	"ServerPackages/_Index/",
	"DevPackages/_Index/",
]);





const uriIs = async (uri: vscode.Uri, fileType: vscode.FileType): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		vscode.workspace.fs.stat(uri).then(
			(result => resolve(result.type === fileType)),
			(reason => reject(reason)),
		);
	});
};

const readDir = async (uri: vscode.Uri): Promise<[string, vscode.FileType][]> => {
	return new Promise((resolve, reject) => {
		vscode.workspace.fs.readDirectory(uri).then(
			(result => resolve(result)),
			(reason => reject(reason)),
		);
	});
};

const readFile = async (uri: vscode.Uri): Promise<string> => {
	return new Promise((resolve, reject) => {
		vscode.workspace.fs.readFile(uri).then(
			(result => resolve(result.toString())),
			(reason => reject(reason)),
		);
	});
};





const findPackageRootInIndex = async (
	indexUri: vscode.Uri,
	scope: string,
	name: string,
	version: string
): Promise<vscode.Uri> => {
	// Make sure the index uri is a directory
	const indexIsDir = await uriIs(indexUri, vscode.FileType.Directory);
	if (indexIsDir) {
		// Look for the first compatible
		// package directory in the index
		let dirFound: string | undefined;
		const dirWanted = `${scope}_${name}@`;
		const dirEntries = await readDir(indexUri);
		for (const [dirEntry, dirEntryType] of dirEntries) {
			if (
				dirEntryType === vscode.FileType.Directory
				&& dirEntry.startsWith(dirWanted)
				&& isSemverCompatible(version, dirEntry.slice(dirWanted.length))
			) {
				dirFound = dirEntry;
				break;
			}
		}
		// Finally, look for the inner folder
		// which is just named after the package
		if (dirFound) {
			const packageRootUri = vscode.Uri.joinPath(indexUri, `${dirFound}/${name}`);
			const packageRootIsDir = await uriIs(indexUri, vscode.FileType.Directory);
			if (packageRootIsDir) {
				return packageRootUri;
			}
		}
	}
	throw new Error("Not Found");
};

export const findInstalledPackageRootUri = async (scope: string, name: string, version: string) => {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return null;
	}
	const resultPromises: Promise<vscode.Uri>[] = [];
	for (const folder of workspaceFolders) {
		for (const suffix of PACKAGE_INDEX_FOLDERS) {
			resultPromises.push(
				findPackageRootInIndex(
					vscode.Uri.joinPath(folder.uri, suffix),
					scope, name, version
				)
			);
		}
	}
	try {
		return await Promise.any(resultPromises);
	} catch {
		return null;
	}
};

export const findFileUriInPackageRoot = async (packageRootUri: vscode.Uri, caseInsensitiveFileName: string) => {
	let dirFound: string | undefined;
	const dirEntries = await readDir(packageRootUri);
	const fileNameLow = caseInsensitiveFileName.toLowerCase();
	for (const [dirEntry, dirEntryType] of dirEntries) {
		if (
			dirEntryType === vscode.FileType.File
			&& dirEntry.toLowerCase().startsWith(fileNameLow)
		) {
			dirFound = dirEntry;
			break;
		}
	}
	if (dirFound) {
		return vscode.Uri.joinPath(packageRootUri, dirFound);
	} else {
		return null;
	}
};

export const findFileContentsInPackageRoot = async (packageRootUri: vscode.Uri, caseInsensitiveFileName: string) => {
	const fileUri = await findFileUriInPackageRoot(packageRootUri, caseInsensitiveFileName);
	if (fileUri) {
		return await readFile(fileUri);
	}
	return null;
};