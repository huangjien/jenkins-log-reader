import { ExtensionContext, window, commands, workspace, Range, Uri } from "vscode";
import { JenkinsPanel, showStatusBarProgress } from "./JenkinsPanel";
import JenkinsSettings from "./JenkinsSettings";
import { existsSync, mkdirSync } from "fs";
import { LogReaderResultWebViewProvider } from "./LogReaderResultWebViewProvider";
import { LogReaderSettingWebViewProvider } from "./LogReaderSettingWebViewProvider";
import { GroovyCodeFormat } from "./GroovyFormat";
import * as fs from "fs";
import { getImageAnalysis } from "./getInfoFromJenkins";
import { exec } from "child_process";
import pLimit from "p-limit";

const limit = pLimit(1); // at most, 3 concurrent tasks can be run at the same time

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
  // registerCommandOfReadImages(context, resultViewProvider, imageAiModel, imagePrompt);
  // registerCommandOfReadVideo(context, resultViewProvider, imageAiModel, videoPrompt);
  // registerCommandOfReadVideos(context, resultViewProvider, imageAiModel, videoPrompt);
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

function registerCommandOfReadImages(
  context: ExtensionContext,
  provider: LogReaderResultWebViewProvider,
  imageAiModel: string,
  imagePrompt: string
) {
  commands.registerCommand("jenkins-log-reader.readImages", async (uri: Uri) => {
    // get image file
    // turn it into base64
    // send to AI (llama3.2-vision)
    // show result in result view
    if (uri) {
      // uri need to be a folder, then we check files one by one, only handle image files(check extension)
      const dirItems = fs.readdir(uri.fsPath, (err, files) => {
        if (err) {
          console.error(err);
        } else {
          files
            .filter((file) => {
              return (
                file.toLowerCase().endsWith(".png") ||
                file.toLowerCase().endsWith(".jpg") ||
                file.toLowerCase().endsWith(".jpeg") ||
                file.toLowerCase().endsWith(".gif") ||
                file.toLowerCase().endsWith(".bmp") ||
                file.toLowerCase().endsWith(".webp") ||
                file.toLowerCase().endsWith(".tiff") ||
                file.toLowerCase().endsWith(".svg")
              );
            })
            .map(async (file) => {
              console.log("file: " + file);
              const base64String = fs.readFileSync(uri.fsPath + "/" + file).toString("base64");
              const long_run_task = analyse_image(
                base64String,
                provider,
                imageAiModel,
                imagePrompt
              );
              showStatusBarProgress(
                long_run_task,
                "Analysing the image..." + uri.fsPath + "/" + file
              );
            });
        }
      });
    }
  });
}

function registerCommandOfReadVideos(
  context: ExtensionContext,
  provider: LogReaderResultWebViewProvider,
  imageAiModel: string,
  videoPrompt: string
) {
  commands.registerCommand("jenkins-log-reader.readVideos", async (uri: Uri) => {
    // get image file
    // turn it into base64
    // send to AI (llama3.2-vision)
    // show result in result view
    if (uri) {
      // uri need to be a folder, then we check files one by one, only handle video files(check extension)
      fs.readdir(uri.fsPath, (err, files) => {
        if (err) {
          console.error(err);
        } else {
          files
            .filter((file) => {
              file.toLowerCase().endsWith(".mp4") ||
                file.toLowerCase().endsWith(".3pg") ||
                file.toLowerCase().endsWith(".mov") ||
                file.toLowerCase().endsWith(".ogg") ||
                file.toLowerCase().endsWith(".avi") ||
                file.toLowerCase().endsWith(".mpeg");
            })
            .map(async (file) => {
              console.log("file: " + file);
            });
          // const image_uri = uri;
          // const base64String = fs.readFileSync(image_uri.fsPath).toString("base64");
          // const long_run_task = analyse_image(base64String, provider, imageAiModel, imagePrompt);
          // showStatusBarProgress(long_run_task, "Analysing the image...");
        }
      });
    }
  });
}

function registerCommandOfReadVideo(
  context: ExtensionContext,
  provider: LogReaderResultWebViewProvider,
  imageAiModel: string,
  videoPrompt: string
) {
  context.subscriptions.push(
    commands.registerCommand("jenkins-log-reader.readVideo", async (uri: Uri) => {
      const output_temp_dir = "/tmp/jenkins-log-reader/video/output/";
      if (!fs.existsSync(output_temp_dir)) {
        fs.mkdirSync(output_temp_dir, { recursive: true });
      } else {
        fs.rmSync(output_temp_dir, { recursive: true });
        fs.mkdirSync(output_temp_dir, { recursive: true });
      }
      let tasks: any[]= [];
      if (uri) {
        const command = `ffmpeg -i ${uri.fsPath} -r 1/1 ${output_temp_dir}frame-%04d.png`;
        console.log(command);
        exec(command, (error: any, stdout: any, stderr: any): void => {
          if (error) {
            window.showErrorMessage(`Error: ${error.message}`, "error");
            return;
          }
        });
        console.log("after exec ffmpeg command");
        // for each file under the output_temp_dir, call analyse_image

        fs.readdirSync(output_temp_dir).forEach((file) => {
          
            console.log("file: " + output_temp_dir + file)
            const base64String = fs.readFileSync(output_temp_dir + file).toString("base64");
            const long_task = limit(() => analyse_image(base64String, provider, imageAiModel, videoPrompt)) ;
            tasks.push(long_task)
        });
        
        showStatusBarProgress(Promise.all(tasks), 'Analysing the video...');
        console.log("after analysing finished, delete the output_temp_dir");
        // after analysing finished, delete the output_temp_dir ???
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
        commands.executeCommand("jenkins-log-reader_result-view.focus");
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
      if (information) {
        console.log(information);
        provider.updateContent(information);
        // commands.executeCommand("jenkins-log-reader_result-view.focus");
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
