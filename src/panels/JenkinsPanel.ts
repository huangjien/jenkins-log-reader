import { Uri, Disposable, Webview, window, WebviewPanel, ViewColumn } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { digest, getAllBuild, getAnalysis, getLog, storedData } from "../utilities/getInfoFromJenkins";
import "../extension.css";
import JenkinsSettings from "./JenkinsSettings";
import * as fs from "fs";
import * as path from "path";
import { hash } from "crypto";
// import Settings from "./JenkinsSettings";

export class JenkinsPanel {
  public static currentPanel: JenkinsPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  public static settings: JenkinsSettings | undefined;
  public static storagePath: string;

  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getWebviewContent(panel.webview, extensionUri);
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._setWebviewMessageListener(this._panel.webview);
  }

  public static render(extensionUri: Uri, settings: JenkinsSettings, storagePath: string) {
    JenkinsPanel.settings = settings;
    this.storagePath = storagePath;
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
      <details>
        <summary>
          <div class="inline-flex items-center justify-between mx-auto m-4 p-4 gap-2 w-full " >
            <h1 class="text-xl text-center font-bold mx-8 text-red-600">Jenkins Instance</h1>
            <vscode-button class="text-xs text-center rounded h-6 w-20 self-center ml-4" id="refresh">Refresh</vscode-button>
          </div>
        </summary>
        <section class="grid grid-flow-row grid-rows-2 grid-cols-4 gap-1 content-start">
        
          <vscode-text-field
            id="server_url" readonly
            placeholder="Jenkins Server URL"
            value="${JenkinsPanel.settings?.jenkinsServerUrl}" readonly>Jenkins Server URL
          </vscode-text-field>
          <vscode-text-field
            id="username"
            placeholder="Jenkins User Name"
            value="${JenkinsPanel.settings?.username}" readonly>Jenkins User Name
          </vscode-text-field>
          <vscode-text-field
            id="token"
            placeholder="Jenkins API Token"
            type="password"
            value="${JenkinsPanel.settings?.apiToken}" readonly>Jenkins API Token
          </vscode-text-field>
          
          <vscode-text-field
            id="localAiUrl"
            placeholder="Local AI Endpoint"
            value="${JenkinsPanel.settings?.localAiUrl}" readonly>Local AI Endpoint
          </vscode-text-field>
          <vscode-text-field
            id="model" 
            placeholder="Local AI Model"
            value="${JenkinsPanel.settings?.model}" readonly>Local AI Model
          </vscode-text-field>
          <vscode-text-field
            id="temperature"
            placeholder="Local AI Temperature"
            value="${JenkinsPanel.settings?.temperature}" readonly>Local AI Temperature
          </vscode-text-field>
          <vscode-text-area
            id="prompt" 
            placeholder="Local AI Prompt"
            value="${JenkinsPanel.settings?.prompt}" readonly>
          </vscode-text-area>
          <vscode-progress-ring id="loading" class="place-self-center hidden"></vscode-progress-ring>
        </section>
      </details>
          
        <div class="inline-flex items-center justify-between mx-auto m-4 p-4 gap-2 w-full " >
          <h2 class="text-xl text-center font-bold mx-8 text-yellow-600">Jobs - Builds</h2>
          <vscode-button class="text-xs text-center h-6 w-20 self-center rounded" id="batch">Batch</vscode-button>
        </div>
        <div class="inline-flex flex-wrap gap-1 w-full" >
          <vscode-checkbox class="p-1 m-1" id="success_check" checked="false">SUCCESS</vscode-checkbox>
          <vscode-checkbox class="p-1 m-1" id="failure_check" checked>FAILURE</vscode-checkbox>
          <vscode-checkbox class="p-1 m-1" id="aborted_check" checked>ABORTED</vscode-checkbox>
          <vscode-checkbox class="p-1 m-1" id="ignored_check" checked>IGNORED</vscode-checkbox>
          <vscode-checkbox class="p-1 m-1" id="resolve_check" checked>RESOLVE</vscode-checkbox>
          <vscode-radio-group class="p-1 m-1"  orientation="horizontal" >
            <!-- label class="text-xl" >Recent:</label -->
            <vscode-radio class="p-1 m-1" id="1h_radio" value="3600">1 hour</vscode-radio>
            <vscode-radio class="p-1 m-1" id="8h_radio" checked value="28800">8 hours</vscode-radio>
            <vscode-radio class="p-1 m-1" id="1d_radio" value="86400">1 day</vscode-radio>
            <vscode-radio class="p-1 m-1" id="3d_radio" value="259200">3 days</vscode-radio>
          </vscode-radio-group>
          <p id="count"></p>
        </div>

        <section id="results-container" class="flex flex-wrap gap-1 h-full" > 
          <p id="notification"></p>
          <vscode-data-grid id="basic-grid" grid-template-columns="70% 7vw 10vw 7vw 6vw" aria-label="Jenkins Build Data Grid">
          
          </vscode-data-grid>   
          
        </section>
        <section id="analysis-container" class="flex flex-wrap gap-1 h-full hidden" >
        <details class="w-full" >
          <summary class="flex flex-wrap m-1 p-1">
            <p id="instruct" class="m2 p-2" ></p> 
            <vscode-button class="text-xs text-center h-6 w-20 self-center ml-4 rounded" id="analyse">Analyse</vscode-button>
          </summary>
          <details class="w-full">
            <summary class="text-xl font-bold text-white-600">Jenkins Build Log</summary>
            <pre id="build_log" class=" whitespace-pre-wrap  break-words" ></pre>
          </details>
          <details class="w-full">
            <summary class="text-xl font-bold text-white-600">AI Analysis</summary>
            <div class="flex flex-wrap m-1 p-1 h-full">
              <vscode-text-area rows="10" class="basis-10/12 max-w-5xl" resize="both" id="analysis" placeholder="Not Analysed Yet."></vscode-text-area>
              <vscode-button class=" basis-1/12 text-xs text-center h-6 w-20 self-center ml-4 rounded" id="resolve">Resolve</vscode-button>
            </div>
          </details>
        </details>
        </section>
        <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
      </div>
    </body>
</html>
          `;
  }

  private keepLongTail(inputString: string, size: number) {
    // keep 1st 1k and tail(size)? This is a bad idea, AI got confused!

    if (inputString.length > size) {
      return inputString.slice(-size);
    }
    return inputString;
  }

  private escapeHtml(html: string) {
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  private removePrefixUsingRegex(text: string, prefix: string) {
    // Create a dynamic regex based on the prefix
    let regex = new RegExp("^" + this.escapeRegex(prefix));
    return text.replace(regex, "");
  }

  private escapeRegex(data: string) {
    return data.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escapes regex special characters
  }

  private _setWebviewMessageListener(webView: Webview) {
    webView.onDidReceiveMessage((message) => {
      const command = message.command;

      switch (command) {
        case "refresh":
          const server_url = JenkinsPanel.settings?.jenkinsServerUrl!;
          const auth = btoa(
            JenkinsPanel.settings?.username + ":" + JenkinsPanel.settings?.apiToken
          );

          getAllBuild(server_url, auth)
            .then((data) => {
              // check the local resolve file
              fs.readdir(JenkinsPanel.storagePath, (err, files) => {
                if (err) {
                  console.error("Error reading folder:", err);
                  return;
                }
                const fileSet = new Set(files);
                data.forEach((record) => {
                  if (!record.hash) {
                    return;
                  }
                  if (fileSet.has(record.hash)) {
                    // need to check inside
                    record.result = "RESOLVE";
                  }
                });
                webView.postMessage({ command: "dataGrid", payload: JSON.stringify(data) });
              });
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
          const token = btoa(
            JenkinsPanel.settings?.username + ":" + JenkinsPanel.settings?.apiToken
          );
          const fileName = digest(build_url);
          // const json: storedData = {};
          
          getLog(build_url, token)
            .then((data) => {
              const info = this.keepLongTail(data, JenkinsPanel.settings?.maxToken!);
              // json.push({log:info})
              webView.postMessage({ command: "log", payload: info });
              return info;
            })
            .then((data) => {
              return getAnalysis(
                JenkinsPanel.settings!.localAiUrl,
                JenkinsPanel.settings!.model,
                JenkinsPanel.settings!.temperature,
                JenkinsPanel.settings!.maxToken,
                JenkinsPanel.settings!.prompt,
                data
              );
            })
            .then((ret) => {
              webView.postMessage({
                command: "analysis",
                payload: this.removePrefixUsingRegex(ret!, "```"),
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
          const hash = digest(message.url);
          const analysis = message.analysis;
          const log = message.log;
          fs.writeFileSync(
            JenkinsPanel.storagePath + "/" + hash,
            JSON.stringify({
              instrct: JenkinsPanel.settings?.prompt.replace("$PROMPT$", log),
              input: "",
              output: analysis,
            })
          );
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
