import { Uri, Disposable, Webview, window, WebviewPanel, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import * as weather from "weather-js";
import "../extension.css";
import JenkinsSettings from "./JenkinsSettings";

export class JenkinsPanel {
  public static currentPanel: JenkinsPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  public static settings: JenkinsSettings | undefined;

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getWebviewContent(panel.webview, extensionUri);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static render(extensionUri: Uri, settings: JenkinsSettings) {
    console.log(settings);
    JenkinsPanel.settings = settings;
    if (JenkinsPanel.currentPanel) {
      JenkinsPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      const panel = window.createWebviewPanel("webView", "Jenkins Log Analysis", ViewColumn.One, {
        enableScripts: true,
        localResourceRoots: [Uri.joinPath(extensionUri, "out")],
      });

      JenkinsPanel.currentPanel = new JenkinsPanel(panel, extensionUri);
    }
  }

  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    const webviewUri = getUri(webview, extensionUri, ["out", "webview.js"]);
    const stylesUri = getUri(webview, extensionUri, ["out", "extension.css"]);
    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${stylesUri}">
    <title>Weather Checker</title>
  </head>
    <body>
      <div class="container align-center mx-auto px-16">
        <h1 class="text-xl text-center font-bold text-red-600">Jenkins Instance</h1>
        <br/>
        <section class="grid grid-flow-row grid-rows-3 grid-cols-4 gap-4 content-start" id="search-container">
          <vscode-text-field
            id="server_url"
            placeholder="Jenkins Server URL"
            value="${JenkinsPanel.settings?.jenkinsServerUrl}">Jenkins Server URL
          </vscode-text-field>
          <vscode-text-field
            id="username"
            placeholder="Jenkins User Name"
            value="${JenkinsPanel.settings?.username}">Jenkins User Name
          </vscode-text-field>
          <vscode-text-field
            id="token"
            placeholder="Jenkins API Token"
            type="password"
            value="${JenkinsPanel.settings?.apiToken}">Jenkins API Token
          </vscode-text-field>
          <vscode-button class="rounded text h-8 px-4 m-2" id="refresh">Refresh</vscode-button>
          <vscode-text-field
            id="localAiUrl"
            placeholder="Local AI Endpoint"
            value="${JenkinsPanel.settings?.localAiUrl}">Local AI Endpoint
          </vscode-text-field>
          <vscode-text-field
            id="model"
            placeholder="Local AI Model"
            value="${JenkinsPanel.settings?.model}">Local AI Model
          </vscode-text-field>
          <vscode-text-field
            id="temperature"
            placeholder="Local AI Model"
            value="${JenkinsPanel.settings?.temperature}">Local AI Temperature
          </vscode-text-field>
          <vscode-progress-ring id="loading" class="place-self-center hidden"></vscode-progress-ring>
        </section>
        <vscode-divider ></vscode-divider>
        <br/>
        <h2 class="text-xl text-center font-bold text-yellow-600">Jobs - Builds</h2>
        <br />
        <section id="results-container">
          
          
          <p id="summary"></p>
        </section>
        
        <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
      </div>
    </body>
</html>
          `;
  }

  private _setWebviewMessageListener(webView: Webview) {
    webView.onDidReceiveMessage((message) => {
      console.log(message);
      const command = message.command;
      const location = message.location;
      const unit = message.unit;

      switch (command) {
        case "refresh":
          console.log("refresh button clicked in Jenkins");
          weather.find({ search: location, degreeType: unit }, (err: any, result: any) => {
            if (err) {
              webView.postMessage({
                command: "error",
                message: "Sorry couldn't get weather at this time...",
              });
              return;
            }
            // Get the weather forecast results
            const weatherForecast = result[0];
            // Pass the weather forecast object to the webview
            webView.postMessage({
              command: "weather",
              payload: JSON.stringify(weatherForecast),
            });
          });
          break;
      }
    });
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
