/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentDiagnosticReportKind,
	type DocumentDiagnosticReport,
	SemanticTokensBuilder,
	SemanticTokensParams,
	SemanticTokensDeltaParams,
	CancellationToken,
	DocumentHighlightParams,
	DocumentHighlight
} from 'vscode-languageserver/node'

import {
	TextDocument
} from 'vscode-languageserver-textdocument'

import { legend, Nako3Documents } from './nako3interface.mjs'

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)
const nako3docs: Nako3Documents = new Nako3Documents()

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false
let hasSemantecTokenCapability = false

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	)
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	)
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	)
	hasSemantecTokenCapability = !!(capabilities.textDocument &&
		capabilities.textDocument.semanticTokens
	)

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: {
				openClose: true,
				change: TextDocumentSyncKind.Incremental,
			},
			// Tell the client that this server supports code completion.
			/* completionProvider: {
				resolveProvider: true
			},
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			}, */
			semanticTokensProvider: {
				legend: legend,
				range: false,
				full: {
					delta: false
				}
			},
			documentHighlightProvider: {
			}
		}
	}
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		}
	}
	return result
})

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined)
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.')
		})
	}
})

// The settings
interface Nako3LspSettings {
	maxNumberOfProblems: number
	runtimeMode: string
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: Nako3LspSettings = { maxNumberOfProblems: 1000, runtimeMode: 'wnako' }
let globalSettings: Nako3LspSettings = defaultSettings

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<Nako3LspSettings>> = new Map()

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear()
	} else {
		globalSettings = (
			(change.settings.Nadesiko3Lsp || defaultSettings)
		) as Nako3LspSettings
	}
	// Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
	// We could optimize things here and re-fetch the setting first can compare it
	// to the existing setting, but this is out of scope for this example.
	connection.languages.diagnostics.refresh()
})

function getDocumentSettings(resource: string): Thenable<Nako3LspSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings)
	}
	let result = documentSettings.get(resource)
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'Nadesiko3Lsp'
		})
		documentSettings.set(resource, result)
	}
	return result
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri)
})

/*
connection.languages.diagnostics.on(async (params) => {
	const document = documents.get(params.textDocument.uri)
	if (document !== undefined) {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: await validateTextDocument(document)
		} satisfies DocumentDiagnosticReport
	} else {
		// We don't know the document. We can either try to read it from disk
		// or we don't report problems for it.
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport
	}
})

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	// validateTextDocument(change.document)
})

async function validateTextDocument(textDocument: TextDocument): Promise<Diagnostic[]> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri)

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText()
	const pattern = /\b[A-Z]{2,}\b/g
	let m: RegExpExecArray | null

	let problems = 0
	const diagnostics: Diagnostic[] = []
	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
		problems++
		const diagnostic: Diagnostic = {
			severity: DiagnosticSeverity.Warning,
			range: {
				start: textDocument.positionAt(m.index),
				end: textDocument.positionAt(m.index + m[0].length)
			},
			message: `${m[0]} is all uppercase.`,
			source: 'ex'
		}
		if (hasDiagnosticRelatedInformationCapability) {
			diagnostic.relatedInformation = [
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Spelling matters'
				},
				{
					location: {
						uri: textDocument.uri,
						range: Object.assign({}, diagnostic.range)
					},
					message: 'Particularly for names'
				}
			]
		}
		diagnostics.push(diagnostic)
	}
	return diagnostics
}
*/
connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event')
})
/*
// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		]
	}
)

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details'
			item.documentation = 'TypeScript documentation'
		} else if (item.data === 2) {
			item.detail = 'JavaScript details'
			item.documentation = 'JavaScript documentation'
		}
		return item
	}
)
*/

documents.onDidClose(e => {
	nako3docs.close(e.document)
})

documents.onDidOpen(e => {
	nako3docs.open(e.document)
})

connection.onRequest("textDocument/documentHighlight", (params: DocumentHighlightParams): DocumentHighlight[]|null => {
	const document = documents.get(params.textDocument.uri)
	if (document) {
		nako3docs.setFullText(document)
		return nako3docs.getHighlight(params.textDocument, params.position)
	} else {
		return null
	}
})

connection.languages.semanticTokens.on((params: SemanticTokensParams, token: CancellationToken) => {
	const document = documents.get(params.textDocument.uri)
	if (document) {
		nako3docs.setFullText(document)
		const semanticTokens = nako3docs.getSemanticTokens(params.textDocument)
		return semanticTokens
	} else {
		const builder = new SemanticTokensBuilder()
		return builder.build()
	}
})

connection.onRequest("textDocument/semanticTokens/full/delta", (params: SemanticTokensDeltaParams) => {
	console.log(params)
})

connection.onRequest("textDocument/semanticTokens/full", (params: SemanticTokensParams) => {
	// Implement your logic to provide semantic tokens for the given document here.
	// You should return the semantic tokens as a response.
	const document = documents.get(params.textDocument.uri)
	if (document) {
		nako3docs.setFullText(document)
		const semanticTokens = nako3docs.getSemanticTokens(params.textDocument)
		return semanticTokens
	} else {
		const builder = new SemanticTokensBuilder()
		return builder.build()
	}
})

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()
