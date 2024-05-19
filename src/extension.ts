import { ExtensionContext, window, commands, ViewColumn, workspace } from "vscode";
import { JenkinsPanel } from "./panels/JenkinsPanel";
import JenkinsSettings from "./panels/JenkinsSettings";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

export function activate(context: ExtensionContext) {
  const storagePath = context.globalStorageUri.fsPath;
  if (!existsSync(storagePath)) {
    mkdirSync(storagePath, { recursive: true });
  }
  let disposal = commands.registerCommand("jenkins-log-reader.webView", () => {
    const jenkinsServerUrl = getConfig("jenkins-log-reader.jenkinsServerUrl");

    const logSize = getConfig("jenkins-log-reader.jenkinsLogSize");

    const username = getConfig("jenkins-log-reader.jenkinsUsername");

    const apiToken = getConfig("jenkins-log-reader.jenkinsToken");

    if (!username || !apiToken) {
      window.showInformationMessage("Please configure your Jenkins settings.");
      return;
    }

    const localAiUrl = getConfig("jenkins-log-reader.aiModelUrl");

    const model = getConfig("jenkins-log-reader.aiModel");

    const prompt = getConfig("jenkins-log-reader.aiPrompt");

    const temperature = getConfig("jenkins-log-reader.aiTemperature");

    const maxToken = getConfig("jenkins-log-reader.aiMaxToken");

    if (!localAiUrl || !model) {
      window.showInformationMessage("Please configure your Local AI settings.");
      return;
    }

    JenkinsPanel.render(
      context.extensionUri,
      new JenkinsSettings(
        jenkinsServerUrl,
        logSize,
        username,
        apiToken,
        localAiUrl,
        model,
        prompt,
        temperature,
        maxToken
      ),
      storagePath
    );
  });

  context.subscriptions.push(disposal);
}

function getConfig(config_key: string): any {
  return workspace.getConfiguration().get(config_key);
}
