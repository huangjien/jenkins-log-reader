// The module 'vscode' contains the VS Code extensibility API

const path = require('path')


// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');
const OpenAI = require('openai')
const marked = require('marked')

async function fetchJenkinsLog(jobUrl, username, apiToken) {
  const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
  try {
    const response = await axios.get(`${jobUrl}consoleText`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Jenkins log:', error);
    vscode.window.showErrorMessage(
      'Failed to fetch Jenkins log: ' + error.message
    );
    return null;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {


  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let currentPanel = null;

    // Registering the command that will be invoked by the extension
    let disposable = vscode.commands.registerCommand('jenkins-log-reader.readJenkinsLog', function () {
        // Create and show a new webview
        if (currentPanel) {
            // If we already have a panel, show it.
            currentPanel.reveal(vscode.ViewColumn.One);
        } else {
            // Otherwise, create a new panel.
            currentPanel = vscode.window.createWebviewPanel(
                'reactWebview', // Identifies the type of the webview. Used internally
                'React Webview', // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in.
                {
                    // Enable scripts in the webview
                    enableScripts: true
                }
            );

            // Get path to resource on disk
            const onDiskPath = vscode.Uri.file(
                path.join(context.extensionPath, 'dist', 'bundle.js')
            );

            console.log(onDiskPath)

            // And the uri we use to load this script in the webview
            const scriptUri = currentPanel.webview.asWebviewUri(onDiskPath);

            // Use a nonce to only allow specific scripts to be run
            const nonce = getNonce();

            currentPanel.webview.html = getWebviewContent(scriptUri, nonce);

            // Reset when the current panel is closed
            currentPanel.onDidDispose(() => {
                currentPanel = null;
            }, null, context.subscriptions);
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(scriptUri, nonce) {
  return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="script-src 'nonce-${nonce}';">
          <title>React App</title>
      </head>
      <body>
          <div id="root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}


function removePrefixUsingRegex(text, prefix) {
  // Create a dynamic regex based on the prefix
  let regex = new RegExp("^" + escapeRegex(prefix));
  return text.replace(regex, '');
}

function escapeRegex(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');  // Escapes regex special characters
}

function getConfig(config_key) {
  return vscode.workspace
    .getConfiguration()
    .get(config_key);
}

function showStatusBarProgress(task) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Processing AI Analysis...',
      cancellable: true, // Set to true if you want to allow cancelling the task
    },
    () => {
      return task; // The progress UI will show until this Promise resolves
    }
  );
}


async function aiAnalyse(localAi, model, promptString, panel, temperature, maxToken) {
  await localAi.chat.completions.create({
    model: model,
    messages: [{ role: 'assistant', content: promptString }],
    temperature: temperature,
    max_tokens: maxToken,
  }).then(data => {
    return JSON.stringify(data);
  }).then(data => {
    const evalContent = JSON.parse(data);
    console.log(evalContent)
    const information = evalContent.choices[0]['message']['content'];
    console.log(information);
    const html = marked.parse(removePrefixUsingRegex(information, '```'))
    
    panel.webview.html = `<div>` + panel.webview.html + `<details><summary>AI Analysis (Model: ${model})</summary><div>${html} </div></details></div>`;
  }).catch((err) => {
    vscode.window.showErrorMessage(err.message);
  });
}

// sometimes, the log is too long. we believe that 5k should be enough.
function keepLongTail(inputString , size) {
  if (inputString.length > size) {
    return inputString.slice(-size);
  }
  return inputString;
}

function escapeHtml(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
