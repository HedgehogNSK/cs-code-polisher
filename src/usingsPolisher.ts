import * as vscode from 'vscode';

export interface IFormatOptions {
    removeUnnecessaryUsings: boolean;
    excludePathFromUsingsFormatter: string;
}

const getFormatOptions = (): IFormatOptions => {
    const cfg = vscode.workspace.getConfiguration('cscodepolisher');

    return {
        removeUnnecessaryUsings: cfg.get<boolean>('removeUnnecessaryUsings', true),
        excludePathFromUsingsFormatter: cfg.get<string>('excludePathFromUsingsFormatter', '{**/obj/**,**/Debug/**}'),
    };
};
export async function formatAllDocuments(editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {

    vscode.window.showInformationMessage('Do the `using` chores for whole project');
    var options = getFormatOptions();
    let files = await vscode.workspace.findFiles('**/*.cs', options.excludePathFromUsingsFormatter);

    let csDocs = files.map(vscode.workspace.openTextDocument);
    for (let jd = 0; jd != csDocs.length; ++jd) {
        let doc = await csDocs[jd];
        formatUsings(doc);
    }
}

export async function formatUsingsWrapper(editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    const document = editor.document;

    vscode.window.showInformationMessage(document.fileName + ' usings has been organized ');
    formatUsings(document);
}

export async function formatUsings(document: vscode.TextDocument) {
    var options = getFormatOptions();
    let usingsaMap = getUsingLines(document);
    let usingsBlocks = getUsingsBlocks(document);
    let edit = new vscode.WorkspaceEdit();

    let hasUnnecessaryUsings: boolean = false;
    if (options.removeUnnecessaryUsings) {
        let unnecessaryUsingsBlocks = getUnnecessaryUsingsRange(document);
        if (unnecessaryUsingsBlocks.some(v => v !== null && typeof v !== "undefined")) {
            hasUnnecessaryUsings = true;
            usingsaMap = usingsaMap.filter(usingLine => !unnecessaryUsingsBlocks.some(range => range.contains(usingLine.range)));
        }
    }

    try {
        let lines = Array.from(usingsaMap.values());
        let isSorted = lines.every((value, index, array) =>
            index === 0 || value.text.localeCompare(array[index - 1].text) != -1);
        //If file doesn't have any unnecessary usings and all usings are sorted
        //then break the fixing process to prevent uninvolved files to be marked as dirty 
        if (!hasUnnecessaryUsings && isSorted)
            return;

        lines = lines.sort((a, b) => a.text.localeCompare(b.text));

        //End of line
        const eol = document.eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
        for (let id = usingsBlocks.length - 1; id != -1; --id) {
            let currentRange = usingsBlocks[id];

            let currentLines = lines.filter(line => currentRange.contains(line.range)).sort((a, b) => a.text.localeCompare(b.text));
            let position = currentRange.end;
            for (let j = 0; j != currentLines.length; ++j) {
                let textLine = currentLines[j];
                edit.insert(document.uri, position, textLine.text + eol);
            }
            edit.delete(document.uri, usingsBlocks[id]);
        }
        vscode.workspace.applyEdit(edit);
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
/**
 * Returns TextLines that contents "usings"
 * @param document {@link vscode.TextDocument}
 * @returns using lines {@link Array<vs.TextLine> }.
 */

export function getUsingLines(document: vscode.TextDocument): Array<vscode.TextLine> {
    let array: Array<vscode.TextLine> = new Array();
    for (let id = 0; id != document.lineCount; ++id) {
        let line = document.lineAt(id);
        let hasUsing = line.text.search(/using\s+[.\w]+;/);
        if (!line.isEmptyOrWhitespace && hasUsing == 0) {
            array.push(line);
        }
    }
    return array;
}
/**
 * Return Array of blocks that contain usings 
 * If 2 usings that are splited by end of the line or by whitespace, they goes into same block
 * If 2 usings that are splited by language constructions as namespaces, commas, etc, they goes into different blocks
 * @param document {@link vscode.TextDocument}
 * @returns restricted blocks {@link  Array<vs.Range>} .
 */
export function getUsingsBlocks(document: vscode.TextDocument): Array<vscode.Range> {
    let array: Array<vscode.Range> = new Array();
    let range;
    let evenOneUsing: boolean = false;
    for (let id = 0; id != document.lineCount; ++id) {
        let line = document.lineAt(id);
        let hasUsing = line.text.search(/using\s+[.\w]+;/);
        if (line.isEmptyOrWhitespace || hasUsing == 0) {
            if (range != undefined)
                range = line.range.union(range);
            else
                range = line.range;

            if (!evenOneUsing && hasUsing == 0)
                evenOneUsing = true;

        } else if (evenOneUsing && range != undefined) {
            array.push(range);
            range = undefined;
            evenOneUsing = false;
        }
    }
    return array;
}
