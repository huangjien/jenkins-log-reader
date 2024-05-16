import {
  provideVSCodeDesignSystem,
  Button,
  Dropdown,
  DataGrid,
  Checkbox,
  Radio,
  RadioGroup,
  DataGridCell,
  DataGridRow,
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
  vsCodeCheckbox,
  vsCodeRadioGroup,
  vsCodeRadio,
  vsCodePanelTab,
  vsCodeTextField,
  vsCodeProgressRing,
} from "@vscode/webview-ui-toolkit";


// In order to use the Webview UI Toolkit web components they
// must be registered with the browser (i.e. webview) using the
// syntax below.
provideVSCodeDesignSystem().register(
  vsCodeButton(),
  vsCodeDropdown(),
  vsCodeDivider(),
  vsCodeTextArea(),
  vsCodeOption(),
  vsCodeCheckbox(),
  vsCodeRadio(),
  vsCodeRadioGroup(),
  vsCodeDataGridRow(),
  vsCodeDataGridCell(),
  vsCodeDataGrid(),
  vsCodeProgressRing(),
  vsCodeTextField()
);

var gridData = [];
var displayData = [];

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
  const success_checkbox = document.getElementById("success_check") as Checkbox;
  success_checkbox.addEventListener("change", filterConditionChanged);
  const failure_checkbox = document.getElementById("failure_check") as Checkbox;
  failure_checkbox.addEventListener("change", filterConditionChanged);
  const aborted_checkbox = document.getElementById("aborted_check") as Checkbox;
  aborted_checkbox.addEventListener("change", filterConditionChanged);
  const radio_1h = document.getElementById("1h_radio") as Radio;
  radio_1h.addEventListener("change", filterConditionChanged);
  const radio_3h = document.getElementById("3h_radio") as Radio;
  radio_3h.addEventListener("change", filterConditionChanged);
  const radio_1d = document.getElementById("1d_radio") as Radio;
  radio_1d.addEventListener("change", filterConditionChanged);
  const radio_3d = document.getElementById("3d_radio") as Radio;
  radio_3d.addEventListener("change", filterConditionChanged);
  setVSCodeMessageListener();
}

function filterConditionChanged() {
  console.log("debug");
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
    const command = event.data.command;

    switch (command) {
      case "dataGrid":
        // const response = JSON.parse(event.data.payload);
        gridData = JSON.parse((event.data.payload));
        displayGridData();
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
    summary.textContent = "Getting Information...";
  }
}

function displayGridData() {
  const loading = document.getElementById("loading") as ProgressRing;
  loading.classList.add("hidden");
  const summary = document.getElementById("summary");

  const basicGrid = document.getElementById("basic-grid") as DataGrid;
  


  // Add custom column titles to grid
  basicGrid.columnDefinitions = [
    { columnDataKey: "url", title: "build url" },
    { columnDataKey: "result", title: "result" },
    { columnDataKey: "timestamp", title: "time stamp" },
    { columnDataKey: "hash", title: "hash" },
    { columnDataKey: "duration", title: "duration" },
  ];

  if (summary) {
    summary.textContent = "";
  }

  if (basicGrid) {
    // Populate grid with data
    basicGrid.rowsData = gridData;
  }
}

function displayError(errorMsg) {
  const loading = document.getElementById("loading") as ProgressRing;
  const summary = document.getElementById("summary");
  if (loading && summary) {
    loading.classList.add("hidden");
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
