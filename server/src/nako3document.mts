import { Nako3Tokenizer, Nako3Token, COL_START } from './nako3lexer.mjs'

export const tokenTypes = ['function', 'variable', 'comment', 'string', 'number', 'keyword', 'operator', 'type', 'parameter', 'decorator']
export const tokenModifiers = ['declaration', 'documentation', 'defaultLibrary', 'deprecated', 'readonly']

type HighlightMap = {[k:string]: string | [string, string |string[]]}
const hilightMapping: HighlightMap = {
    NUMBER_EX: 'number',
    NUMBER: 'number',
    COMMENT_LINE: 'comment',
    COMMENT_BLOCK: 'comment',
    STRING_EX: 'string',
    STRING: 'string',
    FUNCTION_DECLARE: 'keyword',
    FUNCTION_ATTRIBUTE: 'decorator',
    FUNCTION_ARG_PARAMETER: 'parameter',
    FUNCTION_ARG_SEPARATOR: 'keyword',
    FUNCTION_ARG_PARENTIS: 'keyword',
    FUNCTION_NAME: ['function', 'declaration'],
    システム定数: ['variable', ['defaultLibrary', 'readonly']],
    システム関数: ['function', ['defaultLibrary']],
    システム変数: ['variable', ['defaultLibrary']],
    ユーザー関数: 'function',
    ここから: 'keyword',
    ここまで: 'keyword',
    もし: 'keyword',
    ならば: 'keyword',
    違えば: 'keyword',
    とは: 'keyword',
    には: 'keyword',
    回: 'keyword',
    間: 'keyword',
    繰返: 'keyword',
    増繰返: 'keyword',
    減繰返: 'keyword',
    後判定: 'keyword',
    反復: 'keyword',
    抜ける: 'keyword',
    続ける: 'keyword',
    戻る: 'keyword',
    先に: 'keyword',
    次に: 'keyword',
    実行速度優先: 'keyword',
    パフォーマンスモニタ適用: 'keyword',
    定める: 'keyword',
    条件分岐: 'keyword',
    増: 'keyword',
    減: 'keyword',
    変数: 'type',
    定数: 'type',
    エラー監視: 'keyword',
    エラー: 'keyword',
    インデント構文: 'keyword',
    DNCLモード: 'keyword',
    モード設定: 'keyword',
    取込: 'keyword',
    モジュール公開既定値: 'keyword',
    逐次実行: ['keyword', ['deprecated']],
    SHIFT_R0: 'operator',
    SHIFT_R: 'operator',
    SHIFT_L: 'operator',
    GE: 'operator',
    LE: 'operator',
    NE: 'operator',
    EQ: 'operator',
    GT: 'operator',
    LT: 'operator',
    NOT: 'operator',
    AND: 'operator',
    OR: 'operator',
    '+': 'operator',
    '-': 'operator',
    '**': 'operator',
    '*': 'operator',
    '@': 'operator',
    '÷÷': 'operator',
    '÷': 'operator',
    '%': 'operator',
    '^': 'operator',
    '&': 'operator',
    ':': 'operator',
    'def_func': 'keyword',
}

interface TokensBuilder {
    build ():any
    push (line: number, col: number, len: number, tokenTyepeIndex: number, tokenModifiersBit: number):void
}
interface SemanticTokens {
    data: Uint32Array
    resultId: string
}

export class Nako3Document<T> {
    lex: Nako3Tokenizer
    filename: string
    semanticTokens?: T
    validSemanticTokens: boolean

    constructor (filename: string) {
        this.lex = new Nako3Tokenizer(filename)
        this.filename = filename
        this.semanticTokens = undefined
        this.validSemanticTokens = false
    }

    updateText(text: string) {
        this.lex.tokenize(text)
        this.lex.fixTokens()
        this.lex.applyFunction()
        this.validSemanticTokens = false
    }

    computeSemanticToken(tokensBuilder: TokensBuilder):void {
        for (const token of this.lex.tokens) {
            const highlightClass = hilightMapping[token.type]
            if (highlightClass) {
                let tokenType:string
                let tokenModifier:string[]
                if (typeof highlightClass === 'string') {
                    tokenType = highlightClass
                    tokenModifier = []
                } else {
                    tokenType = highlightClass[0]
                    if (typeof highlightClass[1] === 'string') {
                        tokenModifier = [highlightClass[1]]
                    } else {
                        tokenModifier = highlightClass[1]
                    }
                }
                // console.log(`${tokenType} range(${token.startLine}:${token.startCol}-${token.endLine}:${token.endCol})`)
                let endCol = token.endCol
                let len = token.len
                if (token.type === 'WORD' || tokenType === 'string' || tokenType === 'number' || tokenType === 'function' || tokenType === 'variable') {
                    endCol = token.resEndCol
                }
                // console.log(`${tokenType}[${tokenModifier}] range(${token.startLine}:${token.startCol}-${token.endLine}:${endCol})`)
                const tokenTypeIndex = tokenTypes.indexOf(tokenType)
                let ng = false
                if (tokenTypeIndex === -1) {
                    console.log(`type:${tokenType} no include lengend`)
                    ng = true
                }
                let tokenModifierBits = 0
                for (const modifier of tokenModifier) {
                    const tokenModifierIndex = tokenModifiers.indexOf(modifier)
                    if (tokenTypeIndex === -1) {
                        console.log(`modifier:${modifier} no include lengend`)
                        ng = true
                        continue
                    }
                    tokenModifierBits |= 1 << tokenModifierIndex
                }
                if (!ng) {
                    let col = token.startCol
                    for (let i = token.startLine;i <= token.endLine;i++) {
                        if (i === token.endLine) {
                            len = endCol - col
                        } else {
                            len = this.lex.lengthLines[i] - col
                        }
                        // console.log(`push ${i}:${col}-${len} ${tokenTypeIndex}[${tokenModifierBits}]`)
                        tokensBuilder.push(i, col, len, tokenTypeIndex, tokenModifierBits)
                        col = COL_START
                    }
                }
            }
        }
        this.semanticTokens = tokensBuilder.build()
        this.validSemanticTokens = true
    }

    getSemanticTokens(tokensBuilder: TokensBuilder): T {
        if (!this.validSemanticTokens) {
            this.computeSemanticToken(tokensBuilder)
        }
        return this.semanticTokens!
    }

    getTokenByPosition(line: number, col: number): Nako3Token|null {
        //const consoleLogToken = (msg:string, token:Nako3Token|null):void => {
        //    if (token === null) {
        //        return
        //    }
        //    console.log(`${msg} token(${token.startLine}:${token.startCol}-${token.endLine}:${token.endCol})`)
        //}
        let i = 0
        let tokens = this.lex.tokens
        const tokenCount = tokens.length
        while (i < tokenCount && tokens[i].endLine < line) {
            i++
        }
        while (i < tokenCount && tokens[i].endLine === line && tokens[i].endCol <= col) {
            i++
        }
        let token = tokens[i]
        if (i < tokenCount && (token.startLine < line || (token.startLine === line && token.startCol <= col))) {
            //console.log(`position(${line}:${col})`)
            //consoleLogToken('find token', token)
            //consoleLogToken('find - 1', i > 0 ? tokens[i - 1]: null)
            //consoleLogToken('find - 2', i > 1 ? tokens[i - 2]: null)
            return tokens[i]
        }
        //console.log(`no token in position(${line}:${col})`)
        //consoleLogToken('last - 0', token)
        //consoleLogToken('last - 1', i > 0 ? tokens[i - 1]: null)
        //consoleLogToken('last - 2', i > 1 ? tokens[i - 2]: null)
        return null
    }
}
