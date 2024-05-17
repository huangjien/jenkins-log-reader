import { Uri, Disposable, Webview, window, WebviewPanel, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { getAllBuild, getAnalysis, getLog } from "../utilities/getInfoFromJenkins";
import "../extension.css";
import JenkinsSettings from "./JenkinsSettings";
// import Settings from "./JenkinsSettings";

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
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}'; style-src-elem ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}">
    <link rel="stylesheet" href="${stylesUri}">
    <title>Jenkins Log Analysis</title>
  </head>
    <body>
      <div class="container align-center mx-auto px-16">
        <h1 class="text-xl text-center font-bold text-red-600">Jenkins Instance</h1>
        <br/>
        <section class="grid grid-flow-row grid-rows-3 grid-cols-4 gap-2 content-start" id="search-container">
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
          <vscode-button class="text-xs text-center h-6 w-20 self-center " id="refresh">Refresh</vscode-button>
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
            placeholder="Local AI Temperature"
            value="${JenkinsPanel.settings?.temperature}">Local AI Temperature
          </vscode-text-field>
          <vscode-text-area
            id="prompt"
            placeholder="Local AI Prompt"
            value="${JenkinsPanel.settings?.prompt}">
          </vscode-text-area>
          <vscode-progress-ring id="loading" class="place-self-center hidden"></vscode-progress-ring>
        </section>
        
        <h2 class="text-xl text-center font-bold text-yellow-600">Jobs - Builds</h2>
        
        <div class="flex flex-wrap gap-1" >
          <vscode-checkbox class="p-2 m-2" id="success_check" checked="false">SUCCESS</vscode-checkbox>
          <vscode-checkbox class="p-2 m-2" id="failure_check" checked>FAILURE</vscode-checkbox>
          <vscode-checkbox class="p-2 m-2" id="aborted_check" checked>ABORTED</vscode-checkbox>
          <vscode-checkbox class="p-2 m-2" id="ignored_check" checked>IGNORED</vscode-checkbox>
          <vscode-checkbox class="p-2 m-2" id="resolve_check" checked>RESOLVE</vscode-checkbox>
          <vscode-radio-group class="p-2 m-2"  orientation="horizontal" >
            <!-- label class="text-xl" >Recent:</label -->
            <vscode-radio class="p-2 m-2" id="1h_radio" value="3600">1 hour</vscode-radio>
            <vscode-radio class="p-2 m-2" id="8h_radio" checked value="28800">8 hours</vscode-radio>
            <vscode-radio class="p-2 m-2" id="1d_radio" value="86400">1 day</vscode-radio>
            <vscode-radio class="p-2 m-2" id="3d_radio" value="259200">3 days</vscode-radio>
          </vscode-radio-group>
          <vscode-button class="text-xs text-center h-6 w-20 self-center " id="batch">Batch</vscode-button>
        </div>
        <br />
        <section id="results-container"> 
          <p id="notification"></p>
          <vscode-data-grid id="basic-grid" grid-template-columns="70% 7vw 10vw 7vw 6vw" aria-label="Jenkins Build Data Grid">
          
          </vscode-data-grid>   
          
        </section>
        <section id="analysis-container" class="hidden" >
        <details >
          <summary class="flex flex-wrap m-2 p-2">
            <p id="instruct" class="m2 p-2" ></p> 
            <vscode-button class="text-xs text-center h-6 w-20 self-center " id="analyse">Analyse</vscode-button>
          </summary>
          <p id="build_log" ></p>
        </details>
        
        <p id="input" ></p>
        <p id="output" ></p>

        </section>
        
        <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
      </div>
    </body>
</html>
          `;
  }

  private _setWebviewMessageListener(webView: Webview) {
    webView.onDidReceiveMessage((message) => {
      const command = message.command;

      switch (command) {
        case "refresh":
          const server_url = message.server_url;
          const auth = message.auth;

          getAllBuild(server_url, auth)
            .then((data) => {
              webView.postMessage({ command: "dataGrid", payload: JSON.stringify(data) });
            })
            .catch((err) => {
              webView.postMessage({
                command: "error",
                message: "Sorry couldn't get info at this time, due to " + err,
              });
            });
          break;
        case "analyse":
          const build_url = message.build_url;
          const token = message.auth;

          getLog(build_url, token)
            .then((data) => {
              webView.postMessage({ command: "log", payload: JSON.stringify(data) });
              return data;
            })
            .then((data) => {
              getAnalysis(
                JenkinsPanel.settings!.localAiUrl,
                JenkinsPanel.settings!.apiToken,
                data
              ).then((data) => {
                webView.postMessage({ command: "analysis", payload: JSON.stringify(data) });
              });
            })
            .catch((err) => {
              webView.postMessage({
                command: "error",
                message: "Sorry couldn't get build's log at this time, due to " + err,
              });
            });

          break;
        case "batch":
          console.log("handle all display grid data");

          break;
        case "resolve":
          console.log("save results");
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
function err(reason: any): PromiseLike<never> {
  throw new Error("Function not implemented.");
}
