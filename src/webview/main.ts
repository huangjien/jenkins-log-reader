import {
  provideVSCodeDesignSystem,
  Button,
  Dropdown,
  ProgressRing,
  Divider,
  TextField,
  vsCodeButton,
  vsCodeDropdown,
  vsCodeDivider,
  vsCodeTextArea,
  vsCodeOption,
  vsCodeDataGrid,
  vsCodeDataGridRow,
  vsCodeDataGridCell,
  vsCodeLink,
  vsCodePanelTab,
  vsCodeTextField,
  vsCodeProgressRing,
} from "@vscode/webview-ui-toolkit";
import { GridValue } from "autoprefixer";

// In order to use the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeDropdown(),
  vsCodeOption(),
  vsCodeProgressRing(),
  vsCodeTextField()
);

// Get access to the VS Code API from within the webview context
const vscode = acquireVsCodeApi();

// Just like a regular webpage we need to wait for the webview
// DOM to load before we can reference any of the HTML elements
// or toolkit components
window.addEventListener("load", main);

// Main function that gets executed once the webview DOM loads
function main() {
  const refreshButton = document.getElementById("refresh") as Button;
  refreshButton.addEventListener("click", refresh);
  setVSCodeMessageListener();
}

function refresh() {
  const username = document.getElementById("username") as TextField;
  const token = document.getElementById("token") as TextField;
  const server_url = document.getElementById("server_url") as TextField;
  // const unit = document.getElementById("unit") as Dropdown;
  const response = btoa(username.value + ":" + token.value);
  vscode.postMessage({
    command: "refresh",
    server_url: server_url.value,
    auth: response,
  });

  displayLoadingState();
}

// Sets up an event listener to listen for messages passed from the extension context
// and executes code based on the message that is recieved
function setVSCodeMessageListener() {
  window.addEventListener("message", (event) => {
    console.log(event.data);
    const command = event.data.command;

    switch (command) {
      case "refresh":
        const response = JSON.parse(event.data.payload);
        displayGridData(response);
        break;
      case "error":
        displayError(event.data.message);
        break;
    }
  });
}

function displayLoadingState() {
  const loading = document.getElementById("loading") as ProgressRing;
  // const icon = document.getElementById("icon");
  const summary = document.getElementById("summary");
  if (summary) {
    loading.classList.remove("hidden");
    // icon.classList.add("hidden");
    summary.textContent = "Getting weather...";
  }
}

function displayGridData(response) {
  const loading = document.getElementById("loading") as ProgressRing;

  const summary = document.getElementById("summary");
  if (summary) {
    loading.classList.add("hidden");
    summary.textContent = response;
  }
}

function displayError(errorMsg) {
  const loading = document.getElementById("loading") as ProgressRing;
  const icon = document.getElementById("icon");
  const summary = document.getElementById("summary");
  if (loading && icon && summary) {
    // loading.classList.add("hidden");
    // icon.classList.add("hidden");
    summary.textContent = errorMsg;
  }
}

function getWeatherSummary(weatherData) {
  const skyText = weatherData.current.skytext;
  const temperature = weatherData.current.temperature;
  const degreeType = weatherData.location.degreetype;

  return `${skyText}, ${temperature}${degreeType}`;
}
