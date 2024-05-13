export default class Settings {
  jenkinsServerUrl:string;
  logSize: number;
  username: string;
  apiToken: string;
  localAiUrl: string;
  model: string;
  prompt: string;
  temperature: number;
  maxToken: number;
  constructor(
    jenkinsServerUrl:string,
    logSize: number,
    username: string,
    apiToken: string,
    localAiUrl: string,
    model: string,
    prompt: string,
    temperature: number,
    maxToken: number
  ) {
    this.jenkinsServerUrl = jenkinsServerUrl;
    this.logSize = logSize;
    this.username = username;
    this.apiToken = apiToken;
    this.localAiUrl = localAiUrl;
    this.maxToken = maxToken;
    this.model = model;
    this.prompt = prompt;
    this.temperature = temperature;
  }
}
