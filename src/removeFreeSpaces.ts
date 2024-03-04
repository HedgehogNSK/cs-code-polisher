import * as vscode from 'vscode';
import * as tools from './tools';

const unnecessaryEmptySpaceRegExp = /[\f\t ]+$/gm;
const emptyFileBegin = /^(?<![\w\W])\s*\n/;

export async function removeWhiteSpaces(document: vscode.TextDocument) {

    let options = tools.getFormatOptions();
    let text = document.getText();

    const eol = document.eol === vscode.EndOfLine.LF ? "\\n" : "\\r\\n";
    const modificator = document.eol === vscode.EndOfLine.LF ? "" : "(?!\\n)";
    //If there are N empty line
    //1. in general, leave only 1 empty line: ^${modificator}\s+(?=${eol}) 
    //2. before brackets, remove all of them: ^${modificator}\s+(?=^\s+[\[\]\{\}]))
    //3. at the end of the file, remove all of them and any whitespace before them as well: \s+$(?![\r\n])
    //^${modificator}\s+(?=${eol}|^\s*[\[\]\{\}])|\s+$(?![\r\n])
    const emptyLinesRegExpString = `^${modificator}\\s+(?=${eol}|^\\s*[\\[\\]\\{\\}])|\\s+$(?![\\r\\n])`;
    let emptyLinesRegExp = new RegExp(emptyLinesRegExpString, 'gm');

    const isFormattingNeed = emptyFileBegin.test(text)
        || unnecessaryEmptySpaceRegExp.test(text)
        || emptyLinesRegExp.test(text);
    if (!isFormattingNeed) return;

    text = text.replace(emptyFileBegin, '');
    text = text.replace(emptyLinesRegExp, '');
    text = text.replace(unnecessaryEmptySpaceRegExp, '');
    let range = new vscode.Range(0, 0, document.lineCount, 0);
    range = document.validateRange(range);
    let edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, text);
    vscode.workspace.applyEdit(edit);
    if (options.saveOnEdit)
        document.save();
}

export async function removeWhiteSpacesWrapper(this: any, editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
    const doc = editor.document;
    removeWhiteSpaces(doc);
    vscode.window.showInformationMessage(doc.fileName + ' has been rid of empty space');
}

export async function removeWhiteSpacesInWorkspace(this: any) {
    vscode.window.showInformationMessage('Remove empty space in whole project');
    tools.applyActionToAllFiles(removeWhiteSpaces);
}