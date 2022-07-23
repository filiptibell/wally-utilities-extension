import * as vscode from "vscode";

import {
	PUBLIC_REGISTRY_URL,
} from "./utils/constants";

import {
	WallyLogLevel,
	getGlobalLog,
} from "./utils/logger";

import { WallyManifestFilesystemWatcher, } from "./wally/watcher";
import { setGitHubAuthToken, } from "./wally/github";
import { getRegistryHelper, } from "./wally/registry";

import { WallyCommandsProvider } from "./providers/commands";
import { WallyCompletionProvider } from "./providers/completion";
import { WallyDiagnosticsProvider } from "./providers/diagnostics";
import { WallyHoverProvider} from "./providers/hover";
import { WallyStatusBarProvider } from "./providers/statusbar";





export function activate(context: vscode.ExtensionContext) {
	let conf = vscode.workspace.getConfiguration("wally");
	
	// Set initial global configs
	setGitHubAuthToken(conf.get<string>("auth.token") || null);
	
	// Set initial global log level
	const log = getGlobalLog();
	const logLevel = conf.get<WallyLogLevel>("log.level");
	if (logLevel) {
		log.setLevel(logLevel);
	}
	
	// Always cache the public wally registry authors for fast initial autocomplete
	getRegistryHelper(PUBLIC_REGISTRY_URL).getPackageAuthors();
	
	// Create filesystem watcher for wally.toml files
	const watcher = new WallyManifestFilesystemWatcher();
	
	// Create all providers
	const commands = new WallyCommandsProvider();
	const statusBar = new WallyStatusBarProvider();
	const diags = new WallyDiagnosticsProvider(watcher, statusBar);
	const compl = new WallyCompletionProvider();
	const hover = new WallyHoverProvider();
	
	// Set initial enabled states for providers
	statusBar.setIsEnabled(conf.get<boolean>("statusBar.enabled"));
	diags.setEnabled(conf.get<boolean>("diagnostics.enabled") !== false);
	compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
	hover.setEnabled(conf.get<boolean>("hover.enabled") !== false);
	
	// Listen to extension configuration changing
	const config = vscode.workspace.onDidChangeConfiguration(event => {
		// Check if a setting for this specific extension changed
		if (event.affectsConfiguration("wally")) {
			log.normalText(`Changed extension config`);
			// Reload config & create small helper to
			// add extension prefix to setting names
			conf = vscode.workspace.getConfiguration("wally");
			const didChange = (section: string) => {
				return event.affectsConfiguration(`wally.${section}`);
			};
			// Check what specific setting changed
			// NOTE: We can't do an elseif chain here since it's possible
			// to change more than just one extension setting at a time
			if (didChange("auth.token")) {
				setGitHubAuthToken(conf.get<string>("auth.token") || null);
			}
			if (didChange("statusBar.enabled")) {
				statusBar.setIsEnabled(conf.get<boolean>("statusBar.enabled"));
			}
			if (didChange("completion.enabled")) {
				compl.setEnabled(conf.get<boolean>("completion.enabled") !== false);
			}
			if (didChange("diagnostics.enabled")) {
				diags.setEnabled(conf.get<boolean>("diagnostics.enabled") !== false);
			}
			if (didChange("hover.enabled")) {
				hover.setEnabled(conf.get<boolean>("hover.enabled") !== false);
			}
			if (didChange("log.level")) {
				const logLevel = conf.get<WallyLogLevel>("log.level");
				if (logLevel) {
					log.setLevel(logLevel);
				}
			}
		}
	});
	
	// Add everything to cleanup on deactivation
	context.subscriptions.push(watcher);
	context.subscriptions.push(commands);
	context.subscriptions.push(statusBar);
	context.subscriptions.push(diags);
	context.subscriptions.push(compl);
	context.subscriptions.push(hover);
	context.subscriptions.push(config);
}

export function deactivate() { }
