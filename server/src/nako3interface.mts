import {
    SemanticTokens,
    SemanticTokensLegend,
    SemanticTokensBuilder,
    Position,
    Range,
    DocumentHighlight,
    DocumentHighlightKind,
    TextDocumentIdentifier
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

export class Nako3DocumentExt {
    nako3doc: Nako3Document<SemanticTokens>
    constructor (filename: string) {
        this.nako3doc = new Nako3Document(filename)
    }
    rename (newFilename: string):void {
        this.nako3doc.filename = newFilename
    }
    updateText (text: string):void {
        this.nako3doc.updateText(text)
    }
    getSemanticTokens (): SemanticTokens {
        return this.nako3doc.getSemanticTokens(new SemanticTokensBuilder())
    }
    
    getHighlight (position: Position): DocumentHighlight[]|null {
        const line = position.line
        const col = position.character
        const token = this.nako3doc.getTokenByPosition(line, col)
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
}

export class Nako3Documents {
    docs: Map<string, Nako3DocumentExt>
    constructor () {
        this.docs = new Map()
    }
    open (document: TextDocumentIdentifier):void {
        this.docs.set(document.uri, new Nako3DocumentExt(document.uri))
    }
    close (document: TextDocumentIdentifier):void {
        this.docs.delete(document.uri)
    }
    get (document: TextDocumentIdentifier): Nako3DocumentExt|undefined {
        return this.docs.get(document.uri)
    }
    setFullText (document: TextDocument):void {
        const doc = this.get(document)
        if (doc) {
            doc.updateText(document.getText())
        }
    }
    getSemanticTokens(document: TextDocumentIdentifier): SemanticTokens {
        const doc = this.get(document)
        if (doc == null) {
            const builder = new SemanticTokensBuilder()
            return builder.build()
        }
        return doc.getSemanticTokens()
    }
    getHighlight (document: TextDocumentIdentifier, position: Position): DocumentHighlight[]|null {
        const doc = this.get(document)
        if (doc == null) {
            return null
        }
        return doc.getHighlight(position)
    }
}
