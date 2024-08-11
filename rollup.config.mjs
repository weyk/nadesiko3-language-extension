export default {
  input: './server/out/server-entry.mjs',
  output: {
    file: './server/out/server.js',
    format: "cjs",
    exports: "named"
  },
  external: [
    'vscode-languageserver',
    'vscode-languageserver/node',
    'vscode-languageserver-textdocument',
    './nako3/command.json'
  ]
}
