import * as vscode from "vscode";
import JenkinsSettings from "./JenkinsSettings";

export class LogReaderSettingWebViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "webView";
  public _view?: vscode.WebviewView;
  public settings!: JenkinsSettings;
  constructor(private context: vscode.ExtensionContext) {}
  resolveWebviewView(webviewView: vscode.WebviewView): Thenable<void> | void {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this.getWebviewContent();
  }
  getWebviewContent(): string {
    const settings = vscode.workspace.getConfiguration("jenkins-log-reader");
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Log Reader Settings</title>
    </head>
    <body>
        <ul style="text-align: left;padding-left: 0pt;">       
            <li >Jenkins Server URL: <br/><b>&emsp;${settings?.jenkinsServerUrl}</b></li>
            <li >Jenkins User Name: &emsp;<b>${settings?.jenkinsUsername}</b></li>
            <li >Jenkins Log Size: &emsp;<b>${settings?.jenkinsLogSize}</b></li>
            <li >AI Endpoint: &emsp;<b>${settings?.aiModelUrl}</b></li>
            <li >AI Model: &emsp;<b>${settings?.aiModel}</b></li>
            <li >AI Temperature: &emsp;<b>${settings?.aiTemperature}</b></li>
            <li >Prompt: <br/><b>&emsp;${settings?.aiPrompt}</b></li>
            <li >Image AI Model: <br/><b>&emsp;${settings?.imageAiModel}</b></li>
            <li >Image Prompt: <br/><b>&emsp;${settings?.imagePrompt}</b></li>
            <li >Video Prompt: <br/><b>&emsp;${settings?.videoPrompt}</b></li>
        </ul>
    </body>
    </html>
        `;
  }
}
