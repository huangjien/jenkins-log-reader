import {
  provideVSCodeDesignSystem,
  Button,
  DataGrid,
  Checkbox,
  Radio,
  DataGridRow,
  vsCodeButton,
  vsCodeDropdown,
  vsCodeDivider,
  vsCodeTextArea,
  vsCodeOption,
  vsCodeDataGrid,
  vsCodeDataGridRow,
  vsCodeDataGridCell,
  vsCodeCheckbox,
  vsCodeRadioGroup,
  vsCodeRadio,
  vsCodeTextField,
  vsCodeProgressRing,
  vsCodeTag,
  TextArea,
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
  vsCodeTextField(),
  vsCodeTag()
);

var gridData: any[] = [];
var displayData: any[] = [];

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
  const analysed_checkbox = document.getElementById("analysed_check") as Checkbox;
  analysed_checkbox.addEventListener("change", filterConditionChanged);
  const resolve_checkbox = document.getElementById("resolve_check") as Checkbox;
  resolve_checkbox.addEventListener("change", filterConditionChanged);
  const radio_1h = document.getElementById("1h_radio") as Radio;
  radio_1h.addEventListener("change", filterConditionChanged);
  const radio_8h = document.getElementById("8h_radio") as Radio;
  radio_8h.addEventListener("change", filterConditionChanged);
  const radio_1d = document.getElementById("1d_radio") as Radio;
  radio_1d.addEventListener("change", filterConditionChanged);
  const radio_3d = document.getElementById("3d_radio") as Radio;
  radio_3d.addEventListener("change", filterConditionChanged);
  const data_grid = document.getElementById("basic-grid") as DataGridRow;
  data_grid.addEventListener("row-focused", (e: Event) => handleRowFocused(e));
  const batch_button = document.getElementById("batch") as Button;
  batch_button.addEventListener("click", batch);

  setVSCodeMessageListener();
}

function refresh() {
  vscode.postMessage({
    command: "refresh",
  });
}

function batch() {
  var urls: string[] = [];
  displayData.forEach((record) => {
    if (record.result === "FAILURE") {
      urls.push(record.url);
    }
  });
  vscode.postMessage({
    command: "batch",
    url: urls,
  });
}

function debug(message: object) {
  vscode.postMessage({
    command: "debug",
    info: JSON.stringify(message, null, 2),
  });
}

function analyse() {
  // if status is SUCCESS or RESOVLE, then do nothing
  const instruct = document.getElementById("instruct");
  const url = instruct?.innerText;
  vscode.postMessage({
    command: "analyse",
    build_url: url,
  });
}

function showResult() {
  const instruct = document.getElementById("instruct");
  const url = instruct?.innerText;
  vscode.postMessage({
    command: "showResult",
    build_url: url,
  });
}

function resolve() {
  const instruct = document.getElementById("instruct");
  const url = instruct?.textContent;
  const analysis_content = document.getElementById("analysis") as TextArea;
  const analysis = analysis_content.value;
  const log_content = document.getElementById("build_log");
  const log = log_content?.textContent;
  vscode.postMessage({
    command: "resolve",
    url: url,
    log: log,
    analysis: analysis,
  });
}

function handleRowFocused(e: Event) {
  const row = e.target as DataGridRow;
  const ai_section = document.getElementById("analysis-container");
  if (!row || !row.rowData) {
    // clear and hide again
    ai_section?.classList.add("hidden");
    return;
  }
  ai_section?.classList.remove("hidden");
  const instruct = document.getElementById("instruct");
  //get data by url
  // debug(row.rowData)
  const rowDataObject = JSON.parse(JSON.stringify(row.rowData));
  const focused_data = displayData.filter((obj) => {
    return obj.url === rowDataObject["url"];
  });

  if (instruct) {
    instruct.textContent = rowDataObject["url"].replace('"', "");
  }
  const analyse_button = document.getElementById("analyse");
  analyse_button?.addEventListener("click", analyse);
  const showResult_button = document.getElementById("showResult");

  showResult_button?.addEventListener("click", showResult);
  const build_log = document.getElementById("build_log");
  if (build_log) {
    build_log.textContent = focused_data[0]["input"];
  }
  const resolve_button = document.getElementById("resolve");
  resolve_button?.addEventListener("click", resolve);
  if (!focused_data[0]["output"]) {
    showResult_button?.classList.add("hidden");
    resolve_button?.classList.add("hidden");
  } else {
    showResult_button?.classList.remove("hidden");
    resolve_button?.classList.remove("hidden");
  }
  const analysis_content = document.getElementById("analysis") as TextArea;
  if (analysis_content) {
    analysis_content.value = focused_data[0]["output"];
  }
}

function filterConditionChanged() {
  if (gridData.length === 0) {
    return;
  }
  displayData = gridData;
  const success_checkbox = document.getElementById("success_check") as Checkbox;
  const failure_checkbox = document.getElementById("failure_check") as Checkbox;
  const aborted_checkbox = document.getElementById("aborted_check") as Checkbox;
  const resolve_checkbox = document.getElementById("resolve_check") as Checkbox;
  const analysed_checkbox = document.getElementById("analysed_check") as Checkbox;
  const radio_1h = document.getElementById("1h_radio") as Radio;
  const radio_8h = document.getElementById("8h_radio") as Radio;
  const radio_1d = document.getElementById("1d_radio") as Radio;
  const radio_3d = document.getElementById("3d_radio") as Radio;

  if (!success_checkbox.checked.valueOf()) {
    displayData = displayData.filter((el) => {
      return el.result !== "SUCCESS";
    });
  }
  if (!failure_checkbox.checked.valueOf()) {
    displayData = displayData.filter((el) => {
      return el.result !== "FAILURE";
    });
  }
  if (!aborted_checkbox.checked.valueOf()) {
    displayData = displayData.filter((el) => {
      return el.result !== "ABORTED";
    });
  }
  if (!analysed_checkbox.checked.valueOf()) {
    displayData = displayData.filter((el) => {
      return el.result !== "ANALYSED";
    });
  }
  if (!resolve_checkbox.checked.valueOf()) {
    displayData = displayData.filter((el) => {
      return el.result !== "RESOLVE";
    });
  }
  var recent = 28800;
  var now = Date.now();
  if (radio_1h.checked.valueOf()) {
    recent = 3600;
  }
  if (radio_1d.checked.valueOf()) {
    recent = 86400;
  }
  if (radio_8h.checked.valueOf()) {
    recent = 28800;
  }
  if (radio_3d.checked.valueOf()) {
    recent = 259200;
  }
  recent = now - recent * 1000;
  displayData = displayData.filter((el) => {
    return el._timestamp > recent;
  });
  displayGridData();
}

// Sets up an event listener to listen for messages passed from the extension context
// and executes code based on the message that is recieved
function setVSCodeMessageListener() {
  window.addEventListener("message", (event) => {
    const command = event.data.command;

    switch (command) {
      case "dataGrid":
        // const response = JSON.parse(event.data.payload);
        gridData = JSON.parse(event.data.payload);
        filterConditionChanged();
        break;
      case "log":
        const log = event.data.payload;
        const build_log = document.getElementById("build_log");
        if (build_log) {
          build_log.textContent = log;
        }
        break;
      case "analysis":
        const analysis_result = event.data.payload;
        const analysis = document.getElementById("analysis") as TextArea;
        if (analysis) {
          analysis.value = analysis_result;
          const showResult_button = document.getElementById("showResult");
          const resolve_button = document.getElementById("resolve");
          if (showResult_button && resolve_button) {
            showResult_button?.classList.remove("hidden");
            resolve_button?.classList.remove("hidden");
          }
        }
        break;
    }
  });
}

function displayGridData() {
  // const batch_button = document.getElementById("batch") as Button;
  // batch_button.classList.remove("hidden");
  const count = document.getElementById("count")!;
  count.textContent = displayData.length.toString();
  const notification = document.getElementById("notification");

  const basicGrid = document.getElementById("basic-grid") as DataGrid;

  // Add column titles to grid
  basicGrid.columnDefinitions = [
    { columnDataKey: "url", title: "build url" },
    { columnDataKey: "result", title: "result" },
    { columnDataKey: "timestamp", title: "time stamp" },
    { columnDataKey: "hash", title: "hash" },
    { columnDataKey: "duration", title: "duration" },
  ];

  if (notification) {
    notification.textContent = "";
  }

  if (basicGrid) {
    // Populate grid with data
    basicGrid.rowsData = displayData;
  }
}
