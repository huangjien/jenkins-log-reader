import "./extension.css";
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

let gridData: any[] = [];
let displayData: any[] = [];

const vscode = acquireVsCodeApi();

window.addEventListener("load", main);

function main() {
  setupEventListeners();
  setVSCodeMessageListener();
}

function setupEventListeners() {
  addEventListenerToElement<Button>("refresh", "click", refresh);
  addEventListenerToElement<Checkbox>("success_check", "change", filterConditionChanged);
  addEventListenerToElement<Checkbox>("failure_check", "change", filterConditionChanged);
  addEventListenerToElement<Checkbox>("aborted_check", "change", filterConditionChanged);
  addEventListenerToElement<Checkbox>("analysed_check", "change", filterConditionChanged);
  addEventListenerToElement<Checkbox>("resolve_check", "change", filterConditionChanged);
  addEventListenerToElement<Radio>("1h_radio", "change", filterConditionChanged);
  addEventListenerToElement<Radio>("8h_radio", "change", filterConditionChanged);
  addEventListenerToElement<Radio>("1d_radio", "change", filterConditionChanged);
  addEventListenerToElement<Radio>("3d_radio", "change", filterConditionChanged);
  addEventListenerToElement<DataGridRow>("basic-grid", "row-focused", handleRowFocused);
  addEventListenerToElement<Button>("batch", "click", batch);
}

function addEventListenerToElement<T extends HTMLElement>(
  id: string,
  event: string,
  handler: (event: Event) => void
): void {
  const element = document.getElementById(id) as T;
  if (element) {
    element.addEventListener(event, handler);
  }
}

function refresh() {
  vscode.postMessage({
    command: "refresh",
  });
}

function batch() {
  const urls: string[] = [];
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
    ai_section?.classList.add("hidden");
    return;
  }
  ai_section?.classList.remove("hidden");
  const instruct = document.getElementById("instruct");
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

  const filterConditions = [
    { id: "success_check", result: "SUCCESS" },
    { id: "failure_check", result: "FAILURE" },
    { id: "aborted_check", result: "ABORTED" },
    { id: "analysed_check", result: "ANALYSED" },
    { id: "resolve_check", result: "RESOLVE" },
  ];

  filterConditions.forEach((condition) => {
    const checkbox = document.getElementById(condition.id) as Checkbox;
    if (!checkbox.checked) {
      displayData = displayData.filter((el) => el.result !== condition.result);
    }
  });

  let recent = 28800;
  const now = Date.now();
  if ((document.getElementById("1h_radio") as Radio)?.checked) {
    recent = 3600;
  }
  if ((document.getElementById("1d_radio") as Radio)?.checked) {
    recent = 86400;
  }
  if ((document.getElementById("8h_radio") as Radio)?.checked) {
    recent = 28800;
  }
  if ((document.getElementById("3d_radio") as Radio)?.checked) {
    recent = 259200;
  }
  recent = now - recent * 1000;
  displayData = displayData.filter((el) => {
    return el._timestamp > recent;
  });
  displayGridData();
}

function setVSCodeMessageListener() {
  window.addEventListener("message", (event) => {
    const command = event.data.command;

    switch (command) {
      case "dataGrid": {
        gridData = JSON.parse(event.data.payload);
        filterConditionChanged();
        break;
      }
      case "log": {
        const log = event.data.payload;
        const build_log = document.getElementById("build_log");
        if (build_log) {
          build_log.textContent = log;
        }
        break;
      }
      case "analysis": {
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
    }
  });
}

function displayGridData() {
  const count = document.getElementById("count")!;
  count.textContent =
    displayData.length > 1
      ? `Found ${displayData.length} builds`
      : `Found ${displayData.length} build`;

  const basicGrid = document.getElementById("basic-grid") as DataGrid;

  basicGrid.columnDefinitions = [
    { columnDataKey: "url", title: "build url" },
    { columnDataKey: "result", title: "result" },
    { columnDataKey: "timestamp", title: "time stamp" },
    { columnDataKey: "hash", title: "hash" },
    { columnDataKey: "duration", title: "duration" },
  ];

  if (basicGrid) {
    basicGrid.rowsData = displayData;
  }
}
