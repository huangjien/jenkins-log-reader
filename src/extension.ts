/**
 * This example is heavily influenced by the Calico Colors Webview View sample project
 * created by the VS Code team.
 *
 * https://github.com/microsoft/vscode-extension-samples/tree/main/webview-view-sample
 */
import { ExtensionContext, window, commands, ViewColumn } from "vscode";
import { JenkinsPanel } from "./panels/JenkinsPanel";

export function activate(context: ExtensionContext) {

  let disposal = commands.registerCommand('jenkins-log-reader.webView', () => {
    JenkinsPanel.render(context.extensionUri);
    
  });

  context.subscriptions.push(disposal);
}
