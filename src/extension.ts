import * as vscode from "vscode";

import {
	WallyLogLevel,
	WallyLogHelper,
} from "./utils/logger";

import { WallyGithubHelper } from "./wally/github";

import { WallyRegistryHelper } from "./wally/registry";

import {
	WALLY_COMPLETION_SELECTOR,
	WALLY_COMPLETION_TRIGGERS,
	WallyCompletionProvider,
} from "./completion";

export function activate(context: vscode.ExtensionContext) {
	const conf = vscode.workspace.getConfiguration('wally');
	// Create logger class
	const logLevel = conf.get<WallyLogLevel>("log.level");
	const log = new WallyLogHelper(logLevel || "Normal", true);
	// Create classes
	const git = new WallyGithubHelper(log);
	const reg = new WallyRegistryHelper(log, git);
	const compl = new WallyCompletionProvider(log, reg);
	// TODO: Create diagnostic provider
	// TODO: Create lens provider thing
	// Set initial state
	git.setAuthToken(conf.get<string>("auth.token") || null);
	compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
	// Register completion provider for wally manifest
	const complDisposable = vscode.languages.registerCompletionItemProvider(WALLY_COMPLETION_SELECTOR, compl, ...WALLY_COMPLETION_TRIGGERS);
	// TODO: Register diagnostic provider
	// TODO: Register lens provider thing
	// Listen to extension configuration changing
	const configDisposable = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration("auth.token")) {
			git.setAuthToken(conf.get<string>("auth.token") || null);
		} else if (event.affectsConfiguration("completion.enabled")) {
			compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
		} else if (event.affectsConfiguration("log.level")) {
			log.setLevel(conf.get<WallyLogLevel>("log.level") || "Normal");
		}
	});
	// Add everything to cleanup on deactivation
	context.subscriptions.push(log);
	context.subscriptions.push(complDisposable);
	context.subscriptions.push(configDisposable);
	// TODO: Add diagnostic provider
	// TODO: Add lens provider thing
}

export function deactivate() { }
