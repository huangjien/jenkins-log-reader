import * as vscode from "vscode";
import { marked } from "marked";

export class LogReaderResultWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "markdownView";
  public _view?: vscode.WebviewView;
  constructor(private context: vscode.ExtensionContext) {}
  resolveWebviewView(webviewView: vscode.WebviewView): Thenable<void> | void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getWebviewContent(webviewView.webview);
  }
  public updateContent(markdownText: string): void {
    this._view!.webview!.html = this.getWebviewContent(this._view!.webview, markdownText);
  }
  getWebviewContent(webview: vscode.Webview, markdownText: string = ""): string {
    const htmlContent = marked(markdownText)!;
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AI Log Reader</title>
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  </head>
  <body>
      <div id="content">${htmlContent}</div>
  </body>
  </html>
  `;
  }
}
