import axios from "axios";
import OpenAI from "openai";
import * as fs from "fs";
import { createHash } from "crypto";
import { JenkinsPanel } from "../panels/JenkinsPanel";

type Build = {
  url: string;
  timestamp: number; // ISO format
  result: string;
  duration?: number; // ISO format (optional)
};

type SortedBuild = {
  url: string;
  timestamp: string; // ISO format
  _timestamp: number;
  result: string;
  duration?: string; // ISO format (optional)
  hash?: string;
  input: string;
  output: string;
};

type Job = {
  name: string;
  url: string;
  builds: Build[];
};

type JenkinsData = {
  _class: string;
  jobs: Job[];
};

export type storedData = {
  build_url: string;
  build_status: string;
  ai_status: string;
  log: string;
  prompt: string;
  analysis: string;
};

function formatResult(result: string): string {
  if (result.toLowerCase() === "success") {
    return "🌤";
  }
  if (result.toLowerCase() === "failure") {
    return "🌦";
  }
  if (result.toLowerCase() === "failure") {
    return "✨";
  }

  return "☁️";
}

function formatDurationToIso(duration: number): string {
  // Implement logic to convert duration (milliseconds) to ISO 8601 format (e.g., PT2H3M10S)
  // You can use libraries like `moment.js` or implement your own logic
  // This example uses a placeholder function
  return (
    `${Math.floor(duration / (1000 * 60 * 60))}:` + // Placeholder for hours
    `${Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))}` + // Placeholder for minutes
    `:${Math.floor((duration % (1000 * 60)) / 1000)}`
  ); // Placeholder for seconds
}

function getSortedBuilds(data: JenkinsData): SortedBuild[] {
  // Check if the data has the expected structure
  if (data._class !== "hudson.model.Hudson" || !Array.isArray(data.jobs)) {
    throw new Error("Invalid data format. Expected 'hudson.model.Hudson' with 'jobs' array.");
  }

  // Extract all builds from all jobs

  const allBuilds: Build[] = [];
  for (const job of data.jobs) {
    if (!job) {
      continue;
    }
    if (!job.builds) {
      continue;
    }
    allBuilds.push(...job.builds);
  }

  const builds = allBuilds.sort((a, b) => b.timestamp - a.timestamp);

  const validBuilds = builds.filter((el) => {
    return el.result && el.duration && el.url && el.timestamp;
  });

  // Sort the builds by timestamp in descending order
  return validBuilds.map((build) => ({
    url: build.url,
    result: build.result,
    hash: digest(build.url),
    duration: build.duration ? formatDurationToIso(build.duration) : undefined,
    timestamp: new Date(build.timestamp).toISOString().replace("T", " ").substring(0, 19),
    _timestamp: build.timestamp,
    input: "",
    output: "",
  }));
}

export async function getAllBuild(jenkinsServerUrl: string, auth: string) {
  try {
    const response = await axios.get(`${jenkinsServerUrl}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return getSortedBuilds(response.data);
  } catch (error) {
    console.error("Failed to fetch Jenkins log:", error);
    throw error;
  }
}

export function readExistedResult(fileName: string): any {
  const jsonContent = fs.readFileSync(fileName).toString();
  const jsonObject = JSON.parse(JSON.stringify(jsonContent));
  return jsonObject;
}

export function readExistedLog(fileName: string): any {
  const jsonContent = fs.readFileSync(fileName).toString();
  const jsonObject = JSON.parse(jsonContent);
  return jsonObject.input;
}

export function readExistedFile(fileName: string) {
  return readExistedResult(fileName)["input"];
}

export async function getLog(buildUrl: string, auth: string) {
  // if file already exist, then get it from disk
  const fileName = digest(buildUrl);
  if (fs.existsSync(JenkinsPanel.storagePath + "/" + fileName)) {
    return await readExistedLog(JenkinsPanel.storagePath + "/" + fileName);
  }
  if (fs.existsSync(JenkinsPanel.storagePath + "/analysed/" + fileName)) {
    return await readExistedLog(JenkinsPanel.storagePath + "/analysed/" + fileName);
  }
  try {
    const response = await axios.get(`${buildUrl}consoleText`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch Jenkins log:", error);
    throw error;
  }
}

export async function getAnalysis(
  localAiUrl: string,
  model: string,
  temperature: number,
  maxToken: number,
  prompt: string,
  data: string
) {
  const localAi = new OpenAI.OpenAI({
    baseURL: localAiUrl,
    apiKey: model,
  });
  return await localAi.chat.completions
    .create({
      model: model,
      messages: [{ role: "user", content: prompt.replace("$PROMPT$", "\n" + data + "\n") }],
      temperature: temperature,
      max_tokens: maxToken,
    })
    .then((ret) => {
      const information = ret.choices[0]["message"]["content"];
      return [data, information];
    })
    .catch((err) => {
      throw err;
    });
}

export function digest(message: string) {
  return createHash("sha1")
    .update(message.replace(/\s/g, "").replace("　", ""), "utf8")
    .digest("hex")
    .substring(0, 8);
}
