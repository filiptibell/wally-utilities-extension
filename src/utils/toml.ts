import * as vscode from "vscode";

import { tokenize } from "@toml-tools/lexer";





type TomlTokenKind =
	"Newline" | "Whitespace" | "Comment" |
	"KeyValSep" | "Dot" | "IKey" |
	"IQuotedKey" | "IUnquotedKey" | "IString" |
	"BasicMultiLineString" | "BasicString" | "LiteralMultiLineString" |
	"LiteralString" | "IBoolean" | "True" |
	"False" | "IDateTime" | "OffsetDateTime" |
	"LocalDateTime" | "LocalDate" | "LocalTime" |
	"IFloat" | "Float" | "SpecialFloat" |
	"IInteger" | "DecimalInt" | "HexInt" |
	"OctInt" | "BinInt" | "LSquare" |
	"RSquare" | "Comma" | "LCurly" |
	"RCurly" | "UnquotedKey";

type TomlTokenSimple =
	"Newline" | "Whitespace" | "Comment" |
	"KeyValSep" | "Dot" | "Key" | "String" |
	"Boolean" | "DateTime" | "Float" |
	"Integer" | "LSquare" | "RSquare" |
	"Comma" | "LCurly" | "RCurly";

type TomlToken = {
	kind: TomlTokenKind,
	simp: TomlTokenSimple,
	start: vscode.Position,
	end: vscode.Position,
	text: string,
};





const simplifyTomlTokenKind = (kind: TomlTokenKind): TomlTokenSimple => {
	switch (kind) {
		case "IKey":
		case "IQuotedKey":
		case "UnquotedKey":
		case "IUnquotedKey":
			return "Key";
		case "IString":
		case "BasicString":
		case "LiteralString":
		case "BasicMultiLineString":
		case "LiteralMultiLineString":
			return "String";
		case "True":
		case "False":
		case "IBoolean":
			return "Boolean";
		case "IDateTime":
		case "OffsetDateTime":
		case "LocalDateTime":
		case "LocalDate":
		case "LocalTime":
			return "DateTime";
		case "IFloat":
		case "SpecialFloat":
			return "Float";
		case "IInteger":
		case "DecimalInt":
		case "HexInt":
		case "OctInt":
		case "BinInt":
			return "Integer";
		default:
			return kind;
	}
};





export const parseTomlTokens = (document: vscode.TextDocument) => {
	const result = tokenize(document.getText());
	const tokens: TomlToken[] = [];
	if (result.tokens && result.tokens.length > 0) {
		for (const token of result.tokens) {
			if (
				token.tokenType
				&& token.startLine
				&& token.startColumn
				&& token.endLine
				&& token.endColumn
			) {
				const kind = token.tokenType.name as TomlTokenKind;
				const start = new vscode.Position(token.startLine - 1, token.startColumn - 1);
				const end = new vscode.Position(token.endLine - 1, token.endColumn);
				const text = document.getText(new vscode.Range(start, end));
				tokens.push({
					kind,
					simp: simplifyTomlTokenKind(kind),
					start,
					end,
					text,
				});
			}
		}
	}
	return {
		errors: result.errors,
		tokens,
	};
};