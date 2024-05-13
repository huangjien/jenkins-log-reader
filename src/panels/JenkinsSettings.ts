export default class Settings {
  logSize: number;
  username: string;
  apiToken: string;
  localAiUrl: string;
  model: string;
  prompt: string;
  temperature: number;
  maxToken: number;
  constructor(
    logSize: number,
    username: string,
    apiToken: string,
    localAiUrl: string,
    model: string,
    prompt: string,
    temperature: number,
    maxToken: number
  ) {
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
