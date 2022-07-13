import * as vscode from "vscode";

import {
	WallyLogLevel,
	getGlobalLog,
} from "./utils/logger";

import {
	WallyFilesystemWatcher,
} from "./wally/watcher";

import {
	setGitHubAuthToken,
} from "./wally/github";

import {
	getRegistryHelper,
} from "./wally/registry";

import {
	WALLY_COMPLETION_SELECTOR,
	WALLY_COMPLETION_TRIGGERS,
	WallyCompletionProvider,
} from "./completion";
import { WallyDiagnosticsProvider } from "./diagnostics";





export function activate(context: vscode.ExtensionContext) {
	const conf = vscode.workspace.getConfiguration('wally');
	
	// Set initial config stuff
	setGitHubAuthToken(conf.get<string>("auth.token") || null);
	
	// Set initial log level for global log
	const log = getGlobalLog();
	const logLevel = conf.get<WallyLogLevel>("log.level");
	if (logLevel) {
		log.setLevel(logLevel);
	}
	
	// Create filesystem watcher for wally.toml files
	const watcher = new WallyFilesystemWatcher();
	
	// Always cache the public wally registry authors for fast initial autocomplete
	const publicRegistry = getRegistryHelper("https://github.com/UpliftGames/wally-index");
	publicRegistry.getPackageAuthors();
	
	// Create completion provider
	const compl = new WallyCompletionProvider();
	compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
	const complDisposable = vscode.languages.registerCompletionItemProvider(WALLY_COMPLETION_SELECTOR, compl, ...WALLY_COMPLETION_TRIGGERS);
	
	// Create diagnostic provider
	const diagsDisposable = new WallyDiagnosticsProvider(watcher);
	diagsDisposable.setEnabled(conf.get<boolean>("diagnostics.enabled") !== false);
	
	// TODO: Create lens provider thing
	
	// Listen to extension configuration changing
	const configDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration("auth.token")) {
			log.normalText("Changed auth token config");
			setGitHubAuthToken(conf.get<string>("auth.token") || null);
		} else if (event.affectsConfiguration("completion.enabled")) {
			log.normalText("Changed completion config");
			compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
		} else if (event.affectsConfiguration("diagnostics.enabled")) {
			log.normalText("Changed diagnostics config");
			diagsDisposable.setEnabled(conf.get<boolean>("diagnostics.enabled") !== false);
		} else if (event.affectsConfiguration("log.level")) {
			log.normalText("Changed logging config");
			const logLevel = conf.get<WallyLogLevel>("log.level");
			if (logLevel) {
				log.setLevel(logLevel);
			}
		}
	});
	
	// Add everything to cleanup on deactivation
	context.subscriptions.push(complDisposable);
	context.subscriptions.push(configDisposable);
	context.subscriptions.push(diagsDisposable);
	// TODO: Add lens provider thing
}

export function deactivate() { }
