// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as usings from './usingsPolisher';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let disposable1 = vscode.commands.registerTextEditorCommand(
        "cscodepolisher.editAllDocuments", usings.formatAllDocuments);

    context.subscriptions.push(disposable1); 2

    let disposable = vscode.commands.registerTextEditorCommand(
        "cscodepolisher.editCurrentDocument", usings.formatUsingsWrapper);

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
