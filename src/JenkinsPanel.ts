import {
  Uri,
  Disposable,
  Webview,
  window,
  WebviewPanel,
  ViewColumn,
  commands,
  ProgressLocation,
} from "vscode";
import { getUri } from "./getUri";
import { getNonce } from "./getNonce";
import {
  digest,
  getAllBuild,
  getLog,
  getAnalysis,
  readExistedResult,
  getBuildInfo,
} from "./getInfoFromJenkins";
import "./extension.css";
import JenkinsSettings from "./JenkinsSettings";
import * as fs from "fs";
// import * as path from "path";
// import { hash } from "crypto";
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
      const panel = window.createWebviewPanel("webview", "Jenkins Log Analysis", ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
        // localResourceRoots: [Uri.joinPath(extensionUri, "out")],
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
    <title>Jenkins Logs Analysis</title>
  </head>
    <body>
      <div class="container mx-auto">          
        <div class="grid grid-cols-4 gap-1  " >
          <h2 class="col-span-2 text-xl text-center font-bold mx-8 text-inherit">Jobs - Builds</h2>
          <vscode-button class="col-span-1 text-xs text-center h-6 w-20 place-self-end rounded" id="refresh">Refresh</vscode-button>
          <vscode-button class="col-span-1 text-xs text-center h-6 w-20 place-self-end rounded" id="batch">Batch</vscode-button>
        </div>
        <div class="flex flex-auto flex-row gap-1" >
          
          <vscode-checkbox class="p-1 m-0.5" id="success_check" checked="false">SUCCESS</vscode-checkbox>
          <vscode-checkbox class="p-1 m-0.5" id="failure_check" checked>FAILURE</vscode-checkbox>
          <vscode-checkbox class="p-1 m-0.5" id="aborted_check" checked>ABORTED</vscode-checkbox>
          <vscode-checkbox class="p-1 m-0.5" id="analysed_check" checked>ANALYSED</vscode-checkbox>
          <vscode-checkbox class="p-1 m-0.5" id="resolve_check" checked>RESOLVE</vscode-checkbox>
          <vscode-radio-group class="p-1 m-0.5"  orientation="horizontal" >
            <!-- label class="text-xl" >Recent:</label -->
            <vscode-radio class="p-1 m-0.5" id="1h_radio" value="3600">1 hour</vscode-radio>
            <vscode-radio class="p-1 m-0.5" id="8h_radio" checked value="28800">8 hours</vscode-radio>
            <vscode-radio class="p-1 m-0.5" id="1d_radio" value="86400">1 day</vscode-radio>
            <vscode-radio class="p-1 m-0.5" id="3d_radio" value="259200">3 days</vscode-radio>
            <vscode-tag  class="p-1 m-0.5" id="count"></vscode-tag>
          </vscode-radio-group>
          
        </div>

        <section id="results-container" class="flex flex-wrap gap-1 h-full" > 
          <!--vscode-tag id="notification"></vscode-tag -->
          <vscode-data-grid id="basic-grid" grid-template-columns="70% 7vw 10vw 7vw 6vw" aria-label="Jenkins Build Data Grid">
          </vscode-data-grid>   
        </section>
        <section id="analysis-container" class="flex-wrap gap-1 h-full hidden" >
        <details class="w-full" >
          <summary class="flex flex-wrap m-1 p-1 list-none">
            <p id="instruct" class="italic m2 w-9/12 p-2" ></p> 
            <vscode-button class="text-xs text-center h-6 w-1/12 self-center ml-4 rounded" id="analyse">Analyse</vscode-button>
            <vscode-button class="text-xs text-center h-6 w-1/12 self-center ml-4 rounded" id="showResult">View</vscode-button>
          </summary>
          <details class="w-full">
            <summary class="text-xl font-bold text-white-600 list-none">Jenkins Build Log</summary>
            <pre id="build_log" class=" whitespace-pre-wrap  break-words" ></pre>
          </details>
          <details class="w-full">
            <summary class="text-xl font-bold text-white-600 list-none">AI Analysis</summary>
            <div class="flex flex-wrap m-1 p-1 h-full">
              <vscode-text-area rows="10" class=" w-10/12" resize="both" id="analysis" placeholder="Not Analysed Yet."></vscode-text-area>
              <vscode-button class=" w-1/12 text-xs text-center h-6 self-center ml-4 rounded" id="resolve">Resolve</vscode-button>
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

  private keepLongTail(inputString: string) {
    // keep 1st 1k and tail(size)? This is a bad idea, AI got confused!
    return inputString;
  }

  private escapeHtml(html: string) {
    return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  private removePrefixUsingRegex(text: string, prefix: string) {
    // Create a dynamic regex based on the prefix
    const regex = new RegExp("^" + this.escapeRegex(prefix));
    return text.replace(regex, "");
  }

  private escapeRegex(data: string) {
    // eslint-disable-next-line no-useless-escape
    return data.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escapes regex special characters
  }

  private _setWebviewMessageListener(webView: Webview) {
    webView.onDidReceiveMessage((message) => {
      const command = message.command;
      const token = btoa(JenkinsPanel.settings?.username + ":" + JenkinsPanel.settings?.apiToken);
      switch (command) {
        case "refresh": {
          const server_url = JenkinsPanel.settings!.jenkinsServerUrl!;
          const longRunTask_refresh = this.retriveBuilds(server_url, token, webView);
          showStatusBarProgress(longRunTask_refresh, "Retriving build logs...");
          break;
        }
        case "analyse": {
          const build_url = message.build_url;
          const longRunTask_analysis = this.handleAnalysis(build_url, webView, token);
          showStatusBarProgress(longRunTask_analysis, "analysing the log...");
          break;
        }
        case "debug": {
          console.log(message.info);
          break;
        }
        case "showResult": {
          const job_url = message.build_url;
          const nameHash = digest(job_url);
          const jsonContent = fs
            .readFileSync(JenkinsPanel.storagePath + "/analysed/" + nameHash)
            .toString();
          // console.log(jsonContent)
          const jsonObject = JSON.parse(jsonContent);
          const fileContent =
            nameHash +
            "\n\n### " +
            job_url +
            "\n\n <details>\n<summary>Jenkins Log</summary>\n<pre>\n" +
            jsonObject["input"]?.replace(/(?:\r\n|\r|\n)/g, "\n\n") +
            "\n</pre></details>\n\n" +
            jsonObject["output"];
          commands.executeCommand("jenkins-log-reader_result-view.focus");
          commands.executeCommand("jenkins-log-reader.showResult", fileContent);

          break;
        }
        case "batch": {
          message.url.forEach((build_url: string) => {
            const longRunTask_analysis = this.handleAnalysis(build_url, webView, token);
            showStatusBarProgress(longRunTask_analysis, "analysing the build...\n " + build_url);
          });
          break;
        }
        case "resolve": {
          const hash = digest(message.url);
          const analysis = message.analysis;
          const log = message.log;
          const longRunTask_resolve = this.writeResolveFile(hash, log, analysis);
          showStatusBarProgress(longRunTask_resolve, "writing resolve file...");
          break;
        }
      }
    });
  }

  private async retriveBuilds(server_url: string, auth: string, webView: Webview) {
    getAllBuild(server_url, auth)
      .then((data) => {
        // check the local resolve file
        const ret: any[] = [];

        data.forEach((record) => {
          if (!record.hash) {
            return;
          }

          if (fs.existsSync(JenkinsPanel.storagePath + "/analysed/" + record.hash)) {
            record.result = "ANALYSED";
            const fileContent = readExistedResult(
              JenkinsPanel.storagePath + "/analysed/" + record.hash
            );
            const result = JSON.parse(fileContent);
            record.input = result["input"];
            record.output = result["output"];
          }

          if (fs.existsSync(JenkinsPanel.storagePath + "/" + record.hash)) {
            // need to check inside
            record.result = "RESOLVE";
            const fileContent = readExistedResult(JenkinsPanel.storagePath + "/" + record.hash);
            const result = JSON.parse(fileContent);
            record.input = result["input"];
            record.output = result["output"];
          }

          ret.push(record);
        });
        return ret;
      })
      .then((ret) => {
        webView.postMessage({ command: "dataGrid", payload: JSON.stringify(ret) });
      })
      .catch((err) => {
        window.showErrorMessage("Sorry couldn't retrive builds info at this time, due to " + err);
      });
  }

  private async handleAnalysis(build_url: any, webView: Webview, token: string) {
    const result = await getBuildInfo(build_url, token);
    await getLog(build_url, token)
      .then((data) => {
        const info = this.keepLongTail(data);
        webView.postMessage({ command: "log", payload: info });
        return info;
      })
      .then((data) => {
        return getAnalysis(
          JenkinsPanel.settings!.localAiUrl,
          JenkinsPanel.settings!.model,
          JenkinsPanel.settings!.temperature,
          JenkinsPanel.settings!.prompt,
          result + "\n" + data
        );
      })
      .then(([data, ret]) => {
        const content = this.removePrefixUsingRegex(ret!, "```");
        const hash = digest(build_url);
        if (!fs.existsSync(JenkinsPanel.storagePath + "/analysed/")) {
          fs.mkdirSync(JenkinsPanel.storagePath + "/analysed/");
        }
        fs.writeFileSync(
          JenkinsPanel.storagePath + "/analysed/" + hash,
          JSON.stringify(
            {
              instrct: JenkinsPanel.settings?.prompt,
              input: result + "\n" + data,
              output: content,
            },
            null,
            2
          )
        );
        const fileContent =
          hash +
          "\n\n### " +
          build_url +
          "\n\n" +
          result +
          "\n" +
          "\n\n <details>\n<summary>Jenkins Log</summary>\n<pre>\n" +
          data?.replace(/(?:\r\n|\r|\n)/g, "\n\n") +
          "\n</pre></details>\n\n" +
          content;
        fs.writeFileSync(JenkinsPanel.storagePath + "/analysed/" + hash + ".md", fileContent);
        commands.executeCommand("jenkins-log-reader_result-view.focus");
        commands.executeCommand("jenkins-log-reader.showResult", fileContent);

        webView.postMessage({
          command: "analysis",
          payload: fileContent,
        });
      })
      .catch((err) => {
        window.showErrorMessage("Sorry couldn't get build's log at this time, due to " + err);
      });
    // }
  }

  private async readExistedResult(fileName: string, webView: Webview) {
    const jsonContent = fs.readFileSync(fileName).toString();
    const jsonObject = JSON.parse(jsonContent);
    await webView.postMessage({ command: "log", payload: jsonObject["input"] });
    await webView.postMessage({ command: "analysis", payload: jsonObject["output"] });
  }

  private async writeResolveFile(hash: string, log: any, analysis: any) {
    if (fs.existsSync(JenkinsPanel.storagePath + "/analysed/" + hash)) {
      fs.rmSync(JenkinsPanel.storagePath + "/analysed/" + hash);
    }
    fs.writeFileSync(
      JenkinsPanel.storagePath + "/" + hash,
      JSON.stringify(
        {
          instrct: JenkinsPanel.settings?.prompt,
          input: log,
          output: analysis,
        },
        null,
        2
      )
    );
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

function showStatusBarProgress(task: Promise<any>, title = "Processing...") {
  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: title,
      cancellable: true, // Set to true if you want to allow cancelling the task
    },
    () => {
      return task; // The progress UI will show until this Promise resolves
    }
  );
}
