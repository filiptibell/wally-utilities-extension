import * as vscode from "vscode";





type WallyWatcherChangedCallback = (uri: vscode.Uri, doc: vscode.TextDocument) => Promise<void> | void;
type WallyWatcherDeletedCallback = (uri: vscode.Uri) => Promise<void> | void;





export class WallyManifestFilesystemWatcher implements vscode.Disposable {
	private documents: Map<string, vscode.TextDocument> = new Map();
	
	private listenersCreated: Set<WallyWatcherChangedCallback> = new Set();
	private listenersChanged: Set<WallyWatcherChangedCallback> = new Set();
	private listenersDeleted: Set<WallyWatcherDeletedCallback> = new Set();
	
	private disposed: boolean = false;
	private disposables: vscode.Disposable[] = [];
	
	constructor() {
		const fileChangedCallback = (uri: vscode.Uri, doc: vscode.TextDocument) => {
			if (!uri.path.endsWith("wally.toml")) {
				return;
			}
			if (!this.documents.has(uri.path)) {
				this.documents.set(uri.path, doc);
				for (const listener of this.listenersCreated) {
					listener(uri, doc);
				}
			} else {
				for (const listener of this.listenersChanged) {
					listener(uri, doc);
				}
			}
		};
		const fileDeletedCallback = (uri: vscode.Uri) => {
			if (this.documents.has(uri.path)) {
				this.documents.delete(uri.path);
				for (const listener of this.listenersDeleted) {
					listener(uri);
				}
			}
		};
		this.disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				fileChangedCallback(
					editor.document.uri,
					editor.document
				);
			}
		}));
		this.disposables.push(vscode.workspace.onDidChangeTextDocument(event => {
			if (event.contentChanges.length > 0) {
				fileChangedCallback(
					event.document.uri,
					event.document
				);
			}
		}));
		this.disposables.push(vscode.workspace.onDidCloseTextDocument(event => {
			fileDeletedCallback(event.uri);
		}));
		const initialEditor = vscode.window.activeTextEditor;
		if (initialEditor) {
			fileChangedCallback(
				initialEditor.document.uri,
				initialEditor.document
			);
		}
	}
	
	onDidCreate(callback: WallyWatcherChangedCallback) {
		if (!this.disposed) {
			this.listenersCreated.add(callback);
			for (const [_, doc] of this.documents) {
				callback(doc.uri, doc);
			}
		}
	}
	
	onDidChange(callback: WallyWatcherChangedCallback) {
		if (!this.disposed) {
			this.listenersChanged.add(callback);
		}
	}
	
	onDidDelete(callback: WallyWatcherDeletedCallback) {
		if (!this.disposed) {
			this.listenersDeleted.add(callback);
		}
	}
	
	dispose() {
		if (this.disposed !== true) {
			this.disposed = true;
			// Remove listeners
			this.listenersCreated.clear();
			this.listenersChanged.clear();
			this.listenersDeleted.clear();
			// Dispose of everything
			for (const disposable of this.disposables) {
				disposable.dispose();
			}
			this.disposables = new Array();
		}
	}
}
