import * as vscode from "vscode";

import axios from "axios";

const MAX_RESULTS = 8;





type WallySearchResult = {
	description?: string,
	name: string,
	scope: string,
	versions: string[],
};





const tryWallySearch = async (query: string): Promise<WallySearchResult[]> => {
	const response = await axios({
		baseURL: "https://api.wally.run",
		url: `/v1/package-search?query=${encodeURI(query)}`,
	});
	if (response.status >= 200 && response.status < 300) {
		return (response.data as WallySearchResult[]).slice(0, MAX_RESULTS);
	}
	return [];
};

const convertSearchResultsToQuickPickItems = (results: WallySearchResult[]): vscode.QuickPickItem[] => {
	const items: vscode.QuickPickItem[] = [];
	for (const result of results) {
		items.push({
			kind: vscode.QuickPickItemKind.Default,
			label: `${result.scope}/${result.name}`,
			detail: result.description ?? "—",
			description: result.versions[0]
		});
	}
	return items;
};





export const search = async (args: {
	initialQuery?: string
}) => {
	// Create a new quick pick dialog
	const input = vscode.window.createQuickPick();
	input.title = "Wally Registry Search";
	input.placeholder = "Enter a search term";
	input.ignoreFocusOut = true;
	// Create callback to refresh search results
	let last: number | null = Date.now();
	const refresh = (value: string) => {
		const here = Date.now();
		last = here;
		input.items = [];
		tryWallySearch(value).then(results => {
			if (last === here) {
				last = null;
				input.items = convertSearchResultsToQuickPickItems(results);
			}
		});
	};
	// Set initial query if given & refresh initially
	if (args && args.initialQuery) {
		input.value = args.initialQuery;
		refresh(args.initialQuery);
	}
	// Listen for changes and submission
	input.onDidChangeValue(refresh);
	input.onDidAccept(() => {
		const selected = input.selectedItems[0];
		if (selected) {
			// TODO: Go to some kind of details page with actions
		}
	});
	input.onDidHide(() => {
		input.dispose();
	});
	// Show the dialog
	input.show();
};





export default {
	search,
};;
