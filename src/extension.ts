import { ExtensionContext, window, commands, workspace, Range } from "vscode";
import { JenkinsPanel } from "./JenkinsPanel";
import JenkinsSettings from "./JenkinsSettings";
import { existsSync, mkdirSync } from "fs";
import { LogReaderResultWebViewProvider } from "./LogReaderResultWebViewProvider";
import { LogReaderSettingWebViewProvider } from "./LogReaderSettingWebViewProvider";
import groovyBeautify from "groovy-beautify";

export function activate(context: ExtensionContext) {
  registerCommandOfFormatGrooby(context);
  const storagePath = context.globalStorageUri.fsPath;
  if (!existsSync(storagePath)) {
    mkdirSync(storagePath, { recursive: true });
  }
  if (!existsSync(storagePath + "/analysed/")) {
    mkdirSync(storagePath, { recursive: true });
  }
  const jenkinsServerUrl = getConfig("jenkins-log-reader.jenkinsServerUrl");
  if (!jenkinsServerUrl) {
    window.showErrorMessage("Please set Jenkins Server's URL in extension setting!");
  }

  const logSize = getConfig("jenkins-log-reader.jenkinsLogSize");
  if (!logSize) {
    window.showErrorMessage("Please set Log's size you want to retrive, default is 5120!");
  }

  const username = getConfig("jenkins-log-reader.jenkinsUsername");
  if (!username) {
    window.showErrorMessage("Please set Jenkins's username in extension setting!");
  }

  const apiToken = getConfig("jenkins-log-reader.jenkinsToken");
  if (!apiToken || apiToken.length < 16) {
    window.showErrorMessage("Please set Jenkins token in extension setting!");
  }

  const localAiUrl = getConfig("jenkins-log-reader.aiModelUrl");

  const model = getConfig("jenkins-log-reader.aiModel");

  const prompt = getConfig("jenkins-log-reader.aiPrompt");

  const temperature = getConfig("jenkins-log-reader.aiTemperature");

  if (!localAiUrl || !model || !model || !prompt || !temperature) {
    window.showInformationMessage("Please configure your Local AI settings.");
  }

  const settings = new JenkinsSettings(
    jenkinsServerUrl,
    logSize,
    username,
    apiToken,
    localAiUrl,
    model,
    prompt,
    temperature
  );

  setupSettingsViewProvider(context);
  const disposal = commands.registerCommand("jenkins-log-reader.webView", () => {
    JenkinsPanel.render(context.extensionUri, settings, storagePath);
  });

  context.subscriptions.push(disposal);

  const resultViewProvider = setupResultWebviewProvider(context);

  registerCommandOfShowResult(context, resultViewProvider);
}

function registerCommandOfFormatGrooby(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("jenkins-log-reader.formatPipeline", () => {
      const editor = window.activeTextEditor;
      if (editor) {
        const formattedText = groovyBeautify(editor.document.getText());

        window.activeTextEditor?.edit((builder) => {
          const doc = editor.document;
          builder.replace(
            new Range(doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end),
            formattedText
          );
        });
      }
    })
  );
}

function registerCommandOfShowResult(
  context: ExtensionContext,
  provider: LogReaderResultWebViewProvider
) {
  context.subscriptions.push(
    commands.registerCommand("jenkins-log-reader.showResult", (fileContent: string) => {
      if (provider._view) {
        // commands.executeCommand("jenkins-log-reader_result-view.focus");
        if (fileContent) {
          provider.updateContent(fileContent);
        }
      }
    })
  );
}

function setupResultWebviewProvider(context: ExtensionContext) {
  const provider = new LogReaderResultWebViewProvider(context);
  context.subscriptions.push(
    window.registerWebviewViewProvider("jenkins-log-reader_result-view", provider)
  );
  return provider;
}

function setupSettingsViewProvider(context: ExtensionContext) {
  const provider = new LogReaderSettingWebViewProvider(context);
  context.subscriptions.push(
    window.registerWebviewViewProvider("jenkins-log-reader_settings-view", provider)
  );
  return provider;
}

function getConfig(config_key: string): any {
  return workspace.getConfiguration().get(config_key);
}
