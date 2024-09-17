# Jenkins Log Reader

This Visual Studio Code extension allows you to use local AI model to analyse the jenkins log, figures out the failure reason.

## Requirements

You need to install a local AI with model. I will recommend [ollama](https://ollama.com/) and llama3

- Install ollama from [here](https://ollama.com/download)

- Get llama3

`ollama run llama3 ` or `ollama pull llama3`

## How to use it

1. Copy the URL to the failed jenkins job build.

2. press **Command + Shift + p** (For windows: **Ctrl + Shift + p**), choose **Read Jenkins Log** to activate this extension.

   or press shortcut **Command + r** (For windows: **Ctrl + r**)

<img src="resources/activate.png" alt="Settings" />

3. Paste the copied URL to the input box, then press **Enter**.

4. A new web view will appear at editor column. First, it will load the tail of the build log. Then, it will append the AI analysis to this panel.

## Extension Settings

This extension contributes the following settings:

- `jenkins-log-reader.jenkinsLogSize`: Sometimes, the jenkins log is too big, we only analyse the last part of it, default value is: **5120**.
- `jenkins-log-reader.jenkinsUsername`: Jenkins username.
- `jenkins-log-reader.jenkinsToken`: Jenkins user's token, to connect to jenkins instance.
- `jenkins-log-reader.aiModelUrl`: Local AI's rest API endpoint, default value is: **http://localhost:11434/v1**
- `jenkins-log-reader.aiModel`: The local AI model used for log analysis, default value is: **llama3**.
- `jenkins-log-reader.aiPrompt`: Local AI Prompt, \$PROMPT\$ will be replaced by log information, default value is:

```
Analyze the following Jenkins job log to identify the causes of the job failure. The log may contain information about build steps, error messages, stack traces, and other relevant details. Please provide:

1. A summary of the main error or issue that caused the job to fail.
2. Identification of any specific error messages or stack traces that indicate the failure point.
3. Suggestions for potential fixes or next steps to resolve the issue.
4. Any patterns or recurring issues that appear in the log.

Here is the Jenkins job log: \$PROMPT\$
```

- `jenkins-log-reader.aiTemperature`: The more temperature is, the model will use more \"creativity\", and the less temperature instruct model to be \"less creative\", but following your prompt stronger, default value is: **0.6**.
- `jenkins-log-reader.aiMaxToken`: Max token response from AI model, default value is: **8192**.

## Known Issues

- Somtimes, it may not return the meaningful result. Just re-run **Analyse** again, it will generate different analysis.

- Sometimes, the return show incorrect format. That's caused by the markdown to html converter issue. Will fix it soon.

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

---

> Please note that this extension is currently a proof of concept and may have some limitations or bugs. We welcome feedback and contributions to improve the extension. If you enjoy this extension, please consider [buying me a coffee ☕️ ](https://www.buymeacoffee.com/huangjien) to support my work!

<div >
            <a href="https://www.buymeacoffee.com/huangjien" target="_blank" style="display: inline-block;">
                <img
                    src="https://img.shields.io/badge/Donate-Buy%20Me%20A%20Coffee-orange.svg?style=flat-square&logo=buymeacoffee" 
                    align="center"
                />
            </a></div>
<br />

**Enjoy!**
