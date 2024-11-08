import { ExtensionContext, window, commands, workspace, Range, Uri } from "vscode";
import { JenkinsPanel, showStatusBarProgress } from "./JenkinsPanel";
import JenkinsSettings from "./JenkinsSettings";
import { existsSync, fstat, mkdirSync } from "fs";
import { LogReaderResultWebViewProvider } from "./LogReaderResultWebViewProvider";
import { LogReaderSettingWebViewProvider } from "./LogReaderSettingWebViewProvider";
import { GroovyCodeFormat } from "./GroovyFormat";
import * as fs from "fs";
import { getAnalysis, getImageAnalysis } from "./getInfoFromJenkins";

export function activate(context: ExtensionContext) {
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
    window.showWarningMessage("Please set Jenkins token in extension setting!");
  }

  const localAiUrl = getConfig("jenkins-log-reader.aiModelUrl");

  const model = getConfig("jenkins-log-reader.aiModel");

  const prompt = getConfig("jenkins-log-reader.aiPrompt");

  const temperature = getConfig("jenkins-log-reader.aiTemperature");

  if (!localAiUrl || !model || !model || !prompt || !temperature) {
    window.showInformationMessage("Please configure your Local AI settings.");
  }

  const imageAiModel = getConfig("jenkins-log-reader.imageAiModel");

  const imagePrompt = getConfig("jenkins-log-reader.imagePrompt");

  const videoPrompt = getConfig("jenkins-log-reader.videoPrompt");

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
  registerCommandOfReadImage(context, resultViewProvider, imageAiModel, imagePrompt);
  registerCommandOfFormatGrooby(context);
}

function registerCommandOfFormatGrooby(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("jenkins-log-reader.formatPipeline", () => {
      const editor = window.activeTextEditor;
      if (editor) {
        const formattedText = GroovyCodeFormat(editor.document.getText());

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

function registerCommandOfReadImage(
  context: ExtensionContext,
  provider: LogReaderResultWebViewProvider,
  imageAiModel: string,
  imagePrompt: string
) {
  context.subscriptions.push(
    commands.registerCommand("jenkins-log-reader.readImage", async (uri: Uri) => {
      // get image file
      // turn it into base64
      // send to AI (llama3.2-vision)
      // show result in result view
      if (uri) {
        const image_uri = uri;
        const base64String = fs.readFileSync(image_uri.fsPath).toString("base64");
        const long_run_task = analyse_image(base64String, provider, imageAiModel, imagePrompt);
        showStatusBarProgress(long_run_task, "Analysing the image...");
      }
    })
  );
}

async function analyse_image(
  base64String: string,
  provider: LogReaderResultWebViewProvider,
  imageAiModel: string,
  imagePrompt: string
) {
  await getImageAnalysis(imageAiModel, imagePrompt, base64String).then((information: string) => {
    if (provider._view) {
      // commands.executeCommand("jenkins-log-reader_result-view.focus");
      if (information) {
        provider.updateContent(information);
        commands.executeCommand("jenkins-log-reader_result-view.focus");
      }
    }
  });
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
          commands.executeCommand("jenkins-log-reader_result-view.focus");
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
