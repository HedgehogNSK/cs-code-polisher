import * as vscode from 'vscode';
import * as tools from './tools';

export enum Procedure {
    SortImorts = 1 << 0,
    RemoveUnnececcaryImports = 1 << 1,
}
const usingRegExp = new RegExp(/using\s+[.\w]+;/gm);
const usingBlockRegEx = new RegExp(/\s*(using\s+[.\w]+;\s*)+/gm);

export async function formatAllDocuments(this: any) {
    let procedure = this as Procedure;
    if (procedure == undefined)
        throw 'ํProcedure is set incorrect';
    vscode.window.showInformationMessage('Do the `using` chores for whole project');
    var options = tools.getFormatOptions();
    let files = await vscode.workspace.findFiles('**/*.cs', options.excludePathFromChecking);

    let csDocs = files.map(vscode.workspace.openTextDocument);
    for (let jd = 0; jd != csDocs.length; ++jd) {
        let doc = await csDocs[jd];
        formatUsings(doc, procedure);
    }
}

export async function formatUsingsWrapper(this: any, editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    let procedure = this as Procedure;
    if (procedure == undefined)
        throw 'ํProcedure is set incorrect';
    const document = editor.document;

    vscode.window.showInformationMessage(document.fileName + ' usings has been organized ');
    formatUsings(document, procedure);
}

export async function formatUsings(document: vscode.TextDocument, procedure: Procedure) {
    var options = tools.getFormatOptions();
    try {

        if (((procedure | Procedure.RemoveUnnececcaryImports) == procedure)) {
            let edit = removeUnnecessaryImports(document);
            await vscode.workspace.applyEdit(edit);
        }

        if (((procedure | Procedure.SortImorts) == procedure)) {
            let edit = sortUsings(document);
            await vscode.workspace.applyEdit(edit);
        }

        if (options.saveOnEdit)
            document.save();
    }

    catch (ex) {
        let e = ex as Error;
        vscode.window.showWarningMessage(e.message);
    }
};
/**
 * Returns ranges where unnecessary usings appeared
 * @param document {@link vscode.TextDocument}
 * @returns array of ranges with unnecessary usings
 */
export function getUnnecessaryUsingsRange(document: vscode.TextDocument): Array<vscode.Range> {
    return vscode.languages.getDiagnostics(document.uri)
        .filter(diagnostic => {
            let code = diagnostic.code;
            return code !== 'undefined' && code instanceof Object && 'IDE0005' === code.value?.toString();
        })
        .map(x => x.range);
}
export interface IDiagnosticArgs {
    document: vscode.TextDocument;
    changesCount: number;
}

export function sortUsings(document: vscode.TextDocument): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    const text = document.getText();
    const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const eol2 = eol + eol;
    const compareFunction = (x: string, y: string) => x.localeCompare(y);

    let blockMatch;
    while ((blockMatch = usingBlockRegEx.exec(text)) !== null) {
        const startPosition = document.positionAt(blockMatch.index);
        const endPosition = document.positionAt(blockMatch.index + blockMatch[0].length);
        const range = new vscode.Range(startPosition, endPosition);

        let usingExp;
        let usingsArray: string[] = [];
        let blockString = blockMatch[0];

        while ((usingExp = usingRegExp.exec(blockString)) !== null) {
            insertInSortedArray(usingsArray, usingExp[0], compareFunction);
        }
        let result = usingsArray.join(eol) + eol2;
        if (blockMatch.index != 0)
            result = eol2 + result;
        edit.replace(document.uri, range, result);
    }
    return edit;
}
function insertInSortedArray<T>(array: T[], element: T, compareFunction: (param1: T, param2: T) => number): void {
    let index = array.findIndex(_item => compareFunction(_item, element) > 0);
    if (index === -1) {
        index = array.length;
    }
    array.splice(index, 0, element);
}

export function removeUnnecessaryImports(document: vscode.TextDocument): vscode.WorkspaceEdit {

    let edit = new vscode.WorkspaceEdit();
    let unnecessaryUsingsBlocks = getUnnecessaryUsingsRange(document);

    if (unnecessaryUsingsBlocks.length == 0) return edit;
    const zeroPosition = new vscode.Position(0, 0);
    const eofPosition = document.lineAt(document.lineCount - 1).range.end;
    const regex = /\s+/g;
    let firstEmptySpaceRegExp = /\s+/;
    for (let id = 0; id != unnecessaryUsingsBlocks.length; ++id) {

        let range = unnecessaryUsingsBlocks[id];

        let searchPoint = id == 0 ? zeroPosition : unnecessaryUsingsBlocks[id - 1].end;
        let searchRange = new vscode.Range(searchPoint, range.start);
        let text = document.getText(searchRange);

        let match: RegExpExecArray | null;
        let lastIndex: number = 0;
        let lastMatch: RegExpExecArray | null = null;
        while ((match = regex.exec(text)) != null) {
            lastIndex = match.index;
            lastMatch = match;
        }

        if (lastMatch !== null) {
            let offset = document.offsetAt(searchPoint) + lastIndex;
            let usingOffset = document.offsetAt(range.start);
            let matchStartPos = document.positionAt(offset);
            if (offset + lastMatch[0].length == usingOffset)
                range = range.with(matchStartPos);
        }

        searchPoint = id == unnecessaryUsingsBlocks.length - 1 ? eofPosition : unnecessaryUsingsBlocks[id + 1].start;
        searchRange = new vscode.Range(range.end, searchPoint);
        text = document.getText(searchRange);

        if (!range.start.isEqual(zeroPosition))
            firstEmptySpaceRegExp = /\s+(?=$)/m;

        match = firstEmptySpaceRegExp.exec(text);
        if (match !== null && match.index == 0) {
            let offset = document.offsetAt(range.end);
            let matchPosition = document.positionAt(offset + match[0].length);
            range = range.with(undefined, matchPosition);
        }

        unnecessaryUsingsBlocks[id] = range;
    }

    for (let id = unnecessaryUsingsBlocks.length - 1; id != -1; --id) {

        edit.delete(document.uri, unnecessaryUsingsBlocks[id]);
    }

    return edit;
}