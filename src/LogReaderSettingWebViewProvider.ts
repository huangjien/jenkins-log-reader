import * as vscode from "vscode";
import JenkinsSettings from "./JenkinsSettings";

export class LogReaderSettingWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "webView";
  public _view?: vscode.WebviewView;
  public settings!: JenkinsSettings;
  constructor(
    private context: vscode.ExtensionContext,
    settings: JenkinsSettings
  ) {
    this.settings = settings;
  }
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): Thenable<void> | void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getWebviewContent(webviewView.webview);
  }
  getWebviewContent(webview: vscode.Webview): string {
    console.log("in class", this.settings);
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Log Reader Settings</title>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    </head>
    <body>
        <div class="container mx-auto">       
            <p class="w-1/4 m-2">Jenkins Server URL: \t<b>${this.settings?.jenkinsServerUrl}</b></p>
            <p class="w-1/4 m-2">Jenkins User Name: \t<b>${this.settings?.username}</b></p>
            <p class="w-1/4 m-2">AI Endpoint: \t<b>${this.settings?.localAiUrl}</b></p>
            <p class="w-1/4 m-2">AI Model: \t<b>${this.settings?.model}</b></p>
            <p class="w-1/4 m-2">AI Temperature: \t<b>${this.settings?.temperature}</b></p>
            <p class="w-1/4 m-2">Prompt: <br/><br/><b>${this.settings?.prompt}</b></p>
        </div>
    </body>
    </html>
        `;
  }
}
