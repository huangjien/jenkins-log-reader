import * as vscode from "vscode";
import JenkinsSettings from "./JenkinsSettings";

export class LogReaderSettingWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "webView";
  public _view?: vscode.WebviewView;
  public settings!: JenkinsSettings;
  constructor(
    private context: vscode.ExtensionContext
  ) {}
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
    const settings = vscode.workspace.getConfiguration("jenkins-log-reader")
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Log Reader Settings</title>
    </head>
    <body>
        <ol class="container mx-auto">       
            <li class="italic m-2">Jenkins Server URL: \t<b>${settings?.jenkinsServerUrl}</b></li>
            <li class="italic m-2">Jenkins User Name: \t<b>${settings?.jenkinsUsername}</b></li>
            <li class="italic m-2">Jenkins Log Size: \t<b>${settings?.jenkinsLogSize}</b></li>
            <li class="italic m-2">AI Endpoint: \t<b>${settings?.aiModelUrl}</b></li>
            <li class="italic m-2">AI Model: \t<b>${settings?.aiModel}</b></li>
            <li class="italic m-2">AI Max Token: \t<b>${settings?.aiMaxToken}</b></li>
            <li class="italic m-2">AI Temperature: \t<b>${settings?.aiTemperature}</b></li>
            <li class="italic m-2">Prompt: <br/><br/><b>${settings?.aiPrompt}</b></li>
        </ol>
    </body>
    </html>
        `;
  }
}
