import * as vscode from "vscode";

import {
	PUBLIC_REGISTRY_URL,
} from "./utils/constants";

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

import { ALL_COMMANDS } from "./providers/commands";

import {
	WALLY_COMPLETION_SELECTOR,
	WALLY_COMPLETION_TRIGGERS,
	WallyCompletionProvider,
} from "./providers/completion";

import { WallyDiagnosticsProvider } from "./providers/diagnostics";

import {
	WALLY_HOVER_SELECTOR,
	WallyHoverProvider,
} from "./providers/hover";

import {
	WallyStatusBarProvider,
} from "./providers/statusbar";





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
	const publicRegistry = getRegistryHelper(PUBLIC_REGISTRY_URL);
	publicRegistry.getPackageAuthors();
	
	// Create all commands
	const commandDisposables = new Array<vscode.Disposable>();
	for (const [commandIdentifier, commandHandler] of ALL_COMMANDS) {
		commandDisposables.push(vscode.commands.registerCommand(
			commandIdentifier,
			commandHandler,
		));
	}
	
	// Create status bar provider
	const statusBar = new WallyStatusBarProvider();
	statusBar.setIsEnabled(conf.get<boolean>("statusBar.enabled"));
	
	// Create diagnostic provider
	const diags = new WallyDiagnosticsProvider(watcher, statusBar);
	diags.setEnabled(conf.get<boolean>("diagnostics.enabled") !== false);
	
	// Create completion provider
	const compl = new WallyCompletionProvider();
	compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
	const complDisposable = vscode.languages.registerCompletionItemProvider(WALLY_COMPLETION_SELECTOR, compl, ...WALLY_COMPLETION_TRIGGERS);
	
	// Create hover provider
	const hover = new WallyHoverProvider();
	hover.setEnabled(conf.get<boolean>("hover.enabled") !== false);
	const hoverDisposable = vscode.languages.registerHoverProvider(WALLY_HOVER_SELECTOR, hover);
	
	// Listen to extension configuration changing
	const configDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		log.normalText(`Changed extension config`);
		if (event.affectsConfiguration("auth.token")) {
			setGitHubAuthToken(conf.get<string>("auth.token") || null);
		} else if (event.affectsConfiguration("statusBar.enabled")) {
			statusBar.setIsEnabled(conf.get<boolean>("statusBar.enabled"));
		} else if (event.affectsConfiguration("completion.enabled")) {
			compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
		} else if (event.affectsConfiguration("diagnostics.enabled")) {
			diags.setEnabled(conf.get<boolean>("diagnostics.enabled") !== false);
		} else if (event.affectsConfiguration("hover.enabled")) {
			hover.setEnabled(conf.get<boolean>("hover.enabled") !== false);
		} else if (event.affectsConfiguration("log.level")) {
			const logLevel = conf.get<WallyLogLevel>("log.level");
			if (logLevel) {
				log.setLevel(logLevel);
			}
		}
	});
	
	// Add everything to cleanup on deactivation
	context.subscriptions.push(watcher);
	context.subscriptions.push(statusBar);
	context.subscriptions.push(diags);
	context.subscriptions.push(complDisposable);
	context.subscriptions.push(configDisposable);
	context.subscriptions.push(hoverDisposable);
	for (const commandDisposable of commandDisposables) {
		context.subscriptions.push(commandDisposable);
	}
}

export function deactivate() { }
