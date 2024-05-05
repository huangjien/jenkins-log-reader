// The module 'vscode' contains the VS Code extensibility API


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
  let disposable = vscode.commands.registerCommand(
    'jenkins-log-reader.readJenkinsLog',
    async () => {

      // You could prompt the user for these or use configuration settings

      const logSize = getConfig('jenkins-log-reader.jenkinsLogSize');
      
      const username = getConfig('jenkins-log-reader.jenkinsUsername');
      
      const apiToken = getConfig('jenkins-log-reader.jenkinsToken');
      
      if (!username || !apiToken) {
        vscode.window.showInformationMessage(
          'Please configure your Jenkins settings.'
        );
        return;
      }

      const localAiUrl = getConfig('jenkins-log-reader.aiModelUrl');

      const model = getConfig('jenkins-log-reader.aiModel');

      const prompt = getConfig('jenkins-log-reader.aiPrompt');

      const temperature = getConfig('jenkins-log-reader.aiTemperature');

      const maxToken = getConfig('jenkins-log-reader.aiMaxToken');


      if (!localAiUrl || !model) {
        vscode.window.showInformationMessage(
          'Please configure your Local AI settings.'
        );
        return;
      }

      let localAi = new OpenAI.OpenAI({
        baseURL: localAiUrl,
        apiKey: model
      });

      await vscode.window.showInputBox({
        placeHolder: 'Enter the Jenkins job URL, e.g., http://jenkins.local/job/my-job'
      }).then((jobUrl) => {
        if (!jobUrl) {
          return;
        }
        
        fetchJenkinsLog(jobUrl, username, apiToken).then(log => {
          if (log) {
            const info = keepLongTail(log, logSize)
            const panel = vscode.window.createWebviewPanel(
              'jenkinsLog',
              'Jenkins Log',
              vscode.ViewColumn.One
            );
            panel.webview.html = `<br/><details><summary>Jenkins Job Build: ${jobUrl}</summary><pre>${escapeHtml(info)}</pre></details><br/>`;
            const promptString = prompt.replace('$PROMPT$', info);
            // analyse with local AI
            const longRunTask = aiAnalyse(localAi, model, promptString, panel, temperature, maxToken);
            showStatusBarProgress(longRunTask);
          }
        }).catch((err) => {
          vscode.window.showErrorMessage(err.message);
        });

      });

    }
  );

  context.subscriptions.push(disposable);
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
