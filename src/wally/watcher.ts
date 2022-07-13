import * as vscode from "vscode";

import { getGlobalLog, WallyLogHelper } from "../utils/logger";





type WallyFilesystemCallback = (uri: vscode.Uri) => Promise<void> | void;

const WALLY_TOML_GLOB = "**/wally.toml";





export class WallyFilesystemWatcher implements vscode.Disposable {
	private log: WallyLogHelper;
	
	private watcher: vscode.FileSystemWatcher;
	
	private files: Map<string, vscode.Uri> = new Map();
	
	private listenersCreated: Set<WallyFilesystemCallback> = new Set();
	private listenersChanged: Set<WallyFilesystemCallback> = new Set();
	private listenersDeleted: Set<WallyFilesystemCallback> = new Set();
	
	private disposed: boolean = false;
	
	constructor() {
		this.log = getGlobalLog();
		const fileCreatedCallback = (uri: vscode.Uri) => {
			if (uri.path.includes("Packages/_Index/")) {
				return;
			}
			if (!this.files.has(uri.path)) {
				this.files.set(uri.path, uri);
				for (const listener of this.listenersCreated) {
					listener(uri);
				}
			}
		};
		const fileChangedCallback = (uri: vscode.Uri) => {
			if (this.files.has(uri.path)) {
				for (const listener of this.listenersChanged) {
					listener(uri);
				}
			}
		};
		const fileDeletedCallback = (uri: vscode.Uri) => {
			if (this.files.has(uri.path)) {
				this.files.delete(uri.path);
				for (const listener of this.listenersDeleted) {
					listener(uri);
				}
			}
		};
		this.watcher = vscode.workspace.createFileSystemWatcher(WALLY_TOML_GLOB, false, false, false);
		this.watcher.onDidCreate(fileCreatedCallback);
		this.watcher.onDidChange(fileChangedCallback);
		this.watcher.onDidDelete(fileDeletedCallback);
		vscode.workspace.findFiles(WALLY_TOML_GLOB).then(files => {
			for (const uri of files) {
				fileCreatedCallback(uri);
			}
		});
	}
	
	onDidCreate(callback: WallyFilesystemCallback) {
		if (!this.disposed) {
			this.listenersCreated.add(callback);
			for (const [_, uri] of this.files) {
				callback(uri);
			}
		}
	}
	
	onDidChange(callback: WallyFilesystemCallback) {
		if (!this.disposed) {
			this.listenersChanged.add(callback);
		}
	}
	
	onDidDelete(callback: WallyFilesystemCallback) {
		if (!this.disposed) {
			this.listenersDeleted.add(callback);
		}
	}
	
	dispose() {
		if (this.disposed !== true) {
			this.disposed = true;
			this.watcher.dispose();
			this.listenersCreated.clear();
			this.listenersChanged.clear();
			this.listenersDeleted.clear();
		}
	}
}