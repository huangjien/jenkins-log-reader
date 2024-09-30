import {
  CodeBlock,
  padLeft,
  padRight,
  trimSpacesAndTabsLeft,
  trimSpacesAndTabsRight,
  FormatterOptions,
} from "./GroovyFormat";

export class Formatter {
  rules: FormatRule[];
  options: FormatterOptions;

  constructor(rules?: Array<typeof FormatRule>, options?: FormatterOptions) {
    this.rules = rules?.map((r) => new r(this)) || [];
    this.options = options || { width: 80, indent: 2 };
  }

  format(obj: CodeBlock, indent = 0): string {
    let text = "";

    if (obj) {
      const formatRule = this.rules.find((r) => r.matches(obj));
      if (obj.start !== void 0) {
        if (formatRule) {
          text += formatRule.formatStart(obj, indent);
        }
      }

      if (formatRule) {
        text += formatRule.formatChildren(obj, indent);
      }
      if (obj.end !== void 0) {
        if (formatRule) {
          text += formatRule.formatEnd(obj, indent);
        }
      }
    }
    return text;
  }
}

export class FormatRule {
  formatter: Formatter;

  constructor(formatter: Formatter) {
    this.formatter = formatter;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  matches(cb: CodeBlock, siblings?: CodeBlock[]): boolean {
    return true;
  }

  /* Modifies next sibling text before adding it */

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  afterSelf(nextText: string, indent: number): string {
    return nextText;
  }

  /* Modifies previous sibling text before adding it */

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  beforeSelf(prevText: string, indent: number, newLine: boolean): string {
    return prevText;
  }

  /* Modifies child text before adding it */

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  beforeChild(childText: string, indent: number): string {
    return childText;
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  formatStart(cb: CodeBlock, indent: number): string {
    return cb.start ?? "";
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  formatEnd(cb: CodeBlock, indent: number): string {
    return cb.end ?? "";
  }

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  allowBreak(cb: CodeBlock) {
    return false;
  }

  formatChildren(parent: CodeBlock, indent: number) {
    return (
      parent?.children?.reduce((res: string, child, i, children) => {
        const childFormatRule = this.formatter.rules.find((r) => r.matches(child));
        const parentFormatRule = this.formatter.rules.find((r) => r.matches(parent));
        const prevFormatRule = this.formatter.rules.find((r) => r.matches(children[i - 1]));
        const nextFormatRule = this.formatter.rules.find((r) => r.matches(children[i + 1]));

        let childString = this.formatter.format(child, indent);

        if (prevFormatRule) {
          childString = prevFormatRule.afterSelf(childString, indent);
        }
        if (parentFormatRule) {
          childString = parentFormatRule.beforeChild(childString, indent);
        }
        if (nextFormatRule) {
          const trimmed = trimSpacesAndTabsRight(res + childString);
          const newLine =
            !trimmed.length || trimSpacesAndTabsRight(res + childString).endsWith("\n");
          childString = nextFormatRule.beforeSelf(childString, indent, newLine);
        }

        const lastLineLength = res.split("\n").at(-1)?.length ?? 0;
        const childFirstLineLength = childString.split("\n").at(0)?.length ?? 0;
        if (
          lastLineLength + childFirstLineLength > this.formatter.options.width &&
          childFormatRule?.allowBreak(child)
        ) {
          childString = "\n" + childString.trimStart();
          if (parentFormatRule) {
            childString = parentFormatRule.beforeChild(childString, indent + 1);
          }
        }
        res += childString;

        return res;
      }, "") || ""
    );
  }
}

class RootFormatRule extends FormatRule {
  matches(cb: CodeBlock) {
    return cb?.type === "root";
  }

  beforeChild(childText: string): string {
    let text = childText;
    const trimmedRight = trimSpacesAndTabsRight(text);
    if (trimmedRight.endsWith("\n")) {
      text = trimmedRight;
    }
    return text;
  }
}

class BaseBlockRule extends FormatRule {
  beforeChild(childText: string, indent: number): string {
    let text = childText;
    const trimmedLeft = trimSpacesAndTabsLeft(text);
    if (trimmedLeft.startsWith("\n")) {
      text = "\n" + padLeft(trimmedLeft.trimStart(), indent);
    }
    const trimmedRight = trimSpacesAndTabsRight(text);
    if (trimmedRight.endsWith("\n")) {
      text = padRight(trimmedRight, indent);
    }
    return text;
  }
}

class BlockFormatRule extends BaseBlockRule {
  matches(cb: CodeBlock) {
    return cb?.type === "block";
  }

  beforeSelf(prevText: string, indent: number, newLine: boolean) {
    if (!newLine) {
      return prevText.trimEnd() + " ";
    } else {
      return prevText;
    }
  }

  formatEnd(cb: CodeBlock, indent: number) {
    return cb.end ? padLeft(cb.end, indent) : "";
  }

  formatChildren(cb: CodeBlock, indent: number) {
    let blockText = super.formatChildren(cb, indent + 1);
    blockText = blockText.trim();
    return "\n" + padLeft(blockText, indent + 1) + "\n";
  }
}

class KeywordBlockFormatRule extends BlockFormatRule {
  matches(cb: CodeBlock) {
    return cb?.type === "keywordblock";
  }

  formatStart() {
    return "{";
  }

  formatEnd(cb: CodeBlock, indent: number) {
    return padLeft("}\n", indent);
  }
}

class InlineBlockFormatRule extends BaseBlockRule {
  matches(cb: CodeBlock) {
    return cb?.type === "round" || cb?.type === "square";
  }

  isMultiline(cb: CodeBlock) {
    return cb.children?.some((child) => child.start?.includes("\n"));
  }

  beforeSelf(prevText: string, indent: number, newLine: boolean) {
    if (newLine) {
      return trimSpacesAndTabsRight(prevText);
    } else {
      return prevText;
    }
  }

  formatEnd(cb: CodeBlock, indent: number) {
    if (this.isMultiline(cb)) {
      return cb.end ? padLeft(cb.end, indent) : "";
    } else {
      return cb.end ?? "";
    }
  }

  formatChildren(cb: CodeBlock, indent: number) {
    if (this.isMultiline(cb)) {
      let blockText = super.formatChildren(cb, indent + 1);
      blockText = blockText.trim();
      return "\n" + padLeft(blockText, indent + 1) + "\n";
    } else {
      const blockText = super.formatChildren(cb, indent);
      return blockText.trim();
    }
  }
}

class DotSyntaxFormatRule extends FormatRule {
  matches(cb: CodeBlock) {
    return cb?.type === "dot";
  }
  beforeSelf(prevText: string, indent: number, newLine: boolean): string {
    if (newLine) {
      return padRight(trimSpacesAndTabsRight(prevText), indent + 1);
    } else {
      return prevText;
    }
  }
}

class OperatorsRule extends FormatRule {
  matches(cb: CodeBlock) {
    return cb?.type === "operators";
  }

  beforeSelf(prevText: string): string {
    return trimSpacesAndTabsRight(prevText) + " ";
  }

  afterSelf(nextText: string): string {
    return " " + nextText.trimStart();
  }

  allowBreak(): boolean {
    return true;
  }
}

class DelimitersRule extends FormatRule {
  matches(cb: CodeBlock) {
    return cb?.type === "delimiters";
  }

  beforeSelf(prevText: string): string {
    return trimSpacesAndTabsRight(prevText);
  }

  afterSelf(nextText: string): string {
    return " " + trimSpacesAndTabsLeft(nextText);
  }
}

class KeywordRule extends FormatRule {
  matches(cb: CodeBlock) {
    return cb?.type === "keywords";
  }

  beforeSelf(prevText: string, indent: number, newLine: boolean): string {
    if (!newLine) {
      return prevText.trimEnd() + " ";
    } else {
      return prevText;
    }
  }

  afterSelf(nextText: string): string {
    return " " + nextText.trimStart();
  }

  allowBreak(): boolean {
    return true;
  }
}

export default [
  RootFormatRule,
  BlockFormatRule,
  KeywordBlockFormatRule,
  InlineBlockFormatRule,
  DotSyntaxFormatRule,
  KeywordRule,
  OperatorsRule,
  DelimitersRule,
  FormatRule,
];
