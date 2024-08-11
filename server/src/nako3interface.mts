import {
    SemanticTokens,
    SemanticTokensLegend,
    SemanticTokensBuilder,
    Position,
    Range,
    DocumentHighlight,
    DocumentHighlightKind
} from 'vscode-languageserver/node'
import {
	TextDocument
} from 'vscode-languageserver-textdocument'

import { Nako3Document, tokenTypes, tokenModifiers } from './nako3document.mjs'

class SemanticTokensLegendImplement implements SemanticTokensLegend {
    tokenTypes: string[]
    tokenModifiers: string[]
    constructor (tokenTypes: string[], tokenModifiers: string[]) {
        this.tokenTypes = tokenTypes
        this.tokenModifiers = tokenModifiers
    }
}

export const legend = new SemanticTokensLegendImplement(tokenTypes, tokenModifiers)

let nako3doc: Nako3Document<SemanticTokens>|null = null
export function setupUpdateNako3doc(document: TextDocument):void {
	if (nako3doc === null) {
		nako3doc = new Nako3Document(document.uri)
	}
	nako3doc.updateText(document.getText())
}

export function getSemanticTokens(): SemanticTokens {
    if (nako3doc === null) {
        const builder = new SemanticTokensBuilder()
        return builder.build()
    }
    const tokens = nako3doc.getSemanticTokens(new SemanticTokensBuilder())
    return tokens
}

export function getHighlight(position: Position): DocumentHighlight[]|null {
    const line = position.line
    const col = position.character
    if (nako3doc === null) {
        return null
    }
    const token = nako3doc.getTokenByPosition(line, col)
    if (token !== null) {
        let range:Range
        if (token.josi !== '' && typeof token.josiStartCol === 'number') {
            if (col < token.josiStartCol) {
                const startPos = Position.create(token.startLine, token.startCol)
                const endPos = Position.create(token.endLine, token.josiStartCol)
                range = Range.create(startPos, endPos)
            } else {
                const startPos = Position.create(token.endLine, token.josiStartCol)
                const endPos = Position.create(token.endLine, token.endCol)
                range = Range.create(startPos, endPos)
            }
        } else {
            const startPos = Position.create(token.startLine, token.startCol)
            const endPos = Position.create(token.endLine, token.endCol)
            range = Range.create(startPos, endPos)
        }
        return [DocumentHighlight.create(range, DocumentHighlightKind.Text)]
    }
    return null
}
