// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const axios = require('axios');

async function fetchJenkinsLog(jobUrl, username, apiToken) {
  const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');
  try {
    const response = await axios.get(`${jobUrl}/lastBuild/consoleText`, {
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
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "jenkins-log-reader" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand('extension.fetchJenkinsLog', async () => {
    // You could prompt the user for these or use configuration settings
    const jobUrl = vscode.workspace.getConfiguration().get('jenkinsViewer.jobUrl');
    const username = vscode.workspace.getConfiguration().get('jenkinsViewer.username');
    const apiToken = vscode.workspace.getConfiguration().get('jenkinsViewer.apiToken');

    if (!jobUrl || !username || !apiToken) {
        vscode.window.showInformationMessage('Please configure your Jenkins settings.');
        return;
    }

    const log = await fetchJenkinsLog(jobUrl, username, apiToken);
    if (log) {
        const panel = vscode.window.createWebviewPanel('jenkinsLog', 'Jenkins Log', vscode.ViewColumn.One);
        panel.webview.html = `<pre>${escapeHtml(log)}</pre>`;
    }
});

  context.subscriptions.push(disposable);
}

function escapeHtml(html) {
  return html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
