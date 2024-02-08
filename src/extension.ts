// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as usings from './usingsPolisher';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerTextEditorCommand(
        "cscodepolisher.sortImports", usings.formatUsingsWrapper, usings.Procedure.SortImorts);

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerTextEditorCommand(
        "cscodepolisher.removeUnnecessaryImports", usings.formatUsingsWrapper
        , usings.Procedure.RemoveUnnececcaryImports);
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerTextEditorCommand(
        "cscodepolisher.organizeImports", usings.formatUsingsWrapper
        , usings.Procedure.SortImorts | usings.Procedure.RemoveUnnececcaryImports);
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
        "cscodepolisher.sortImportsInWorkspace", usings.formatAllDocuments
        , usings.Procedure.SortImorts);
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
        "cscodepolisher.removeUnnecessaryImportsInWorkspace", usings.formatAllDocuments
        , usings.Procedure.RemoveUnnececcaryImports);
    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand(
        "cscodepolisher.organizeImportsInWorkspace", usings.formatAllDocuments
        , usings.Procedure.SortImorts | usings.Procedure.RemoveUnnececcaryImports);
    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
