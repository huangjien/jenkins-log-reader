import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn } from "vscode";

export class JenkinsPanel {
  public static currentPanel: JenkinsPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getWebviewContent();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)
  }

  public static render(extensionUri: Uri) {
    if (JenkinsPanel.currentPanel) {
        JenkinsPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      const panel = window.createWebviewPanel("hello-world", "Hello World", ViewColumn.One, {
        // Empty for now
      });

      JenkinsPanel.currentPanel = new JenkinsPanel(panel, extensionUri);
    }
  }

  private _getWebviewContent() {
    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hello World!</title>
        </head>
        <body>
          <h1>Hello World!</h1>
        </body>
      </html>
    `;
  }

  public dispose() {
    JenkinsPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

}
