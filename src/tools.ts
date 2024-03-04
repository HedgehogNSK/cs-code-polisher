import * as vscode from 'vscode';

export interface IFormatOptions {
    saveOnEdit: boolean;
    excludePathFromChecking: string;
}

export const getFormatOptions = (): IFormatOptions => {
    const cfg = vscode.workspace.getConfiguration('cscodepolisher');

    return {
        saveOnEdit: cfg.get<boolean>('saveOnEdit', false),
        excludePathFromChecking: cfg.get<string>('excludePathFromChecking', '{**/obj/**,**/Debug/**}'),
    };
};
export function getMatchingLines(document: vscode.TextDocument, func: (a: string) => number): Array<vscode.TextLine> {
    let array: Array<vscode.TextLine> = new Array();
    for (let id = 0; id != document.lineCount; ++id) {
        let line = document.lineAt(id);
        let hasUsing = func(line.text);
        if (!line.isEmptyOrWhitespace && hasUsing == 0) {
            array.push(line);
        }
    }
    return array;
}

export async function getWorkspaceFiles(action: (doc: vscode.TextDocument) => any): Promise<Thenable<vscode.TextDocument>[]> {
    var options = getFormatOptions();
    let files = await vscode.workspace.findFiles('**/*.cs', options.excludePathFromChecking);
    return files.map(vscode.workspace.openTextDocument);

}

export async function applyActionToAllFiles(action: (doc: vscode.TextDocument) => any) {
    let csDocs = await getWorkspaceFiles(action);
    for (let jd = 0; jd != csDocs.length; ++jd) {
        let doc = await csDocs[jd];
        action(doc);
    }
}