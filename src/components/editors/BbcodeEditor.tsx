import { Typography } from "antd";
import { useEffect, useEffectEvent, useId, useRef } from "react";
import "sceditor/minified/themes/default.min.css";
import "sceditor/minified/sceditor.min.js";
import "sceditor/minified/formats/bbcode.js";
import "sceditor/minified/icons/material.js";
import "sceditor/languages/ru.js";
import styles from "./BbcodeEditor.module.css";

type EditorInstance = {
  bind: (eventName: string, handler: () => void) => void;
  closeDropDown: (focus?: boolean) => void;
  createDropDown: (caller: HTMLElement, name: string, content: HTMLElement) => void;
  destroy: () => void;
  execCommand: (command: string, param?: string) => void;
  focus: () => void;
  inSourceMode: () => boolean;
  currentNode: () => Node | null;
  sourceEditorInsertText: (start: string, end?: string) => void;
  wysiwygEditorInsertHtml: (start: string, end?: string | null) => void;
  val: {
    (): string;
    (value: string): void;
  };
};

type EditorCommandDefinition = {
  exec?: (this: EditorInstance, caller: HTMLElement) => void;
  tooltip?: string;
};

type EditorApi = {
  create: (
    element: HTMLTextAreaElement,
    options: {
      autoUpdate?: boolean;
      emoticonsEnabled?: boolean;
      format: string;
      height?: number;
      icons?: string;
      locale?: string;
      resizeEnabled?: boolean;
      toolbar?: string;
      width?: number | string;
    },
  ) => void;
  instance: (element: HTMLTextAreaElement) => EditorInstance | null;
  locale?: Record<string, Record<string, string>>;
  command?: {
    set: (name: string, definition: EditorCommandDefinition) => void;
  };
};

type BbcodeEditorProps = {
  helper?: string;
  label: string;
  onChange: (value: string) => void;
  value?: string;
};

function getEditorApi() {
  const sceditor = (window as { sceditor?: EditorApi }).sceditor;

  if (!sceditor) {
    throw new Error("SCEditor is not available on window.");
  }

  return sceditor;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function getCurrentElement(editor: EditorInstance) {
  const currentNode = editor.currentNode();

  if (!currentNode) {
    return null;
  }

  return currentNode.nodeType === Node.ELEMENT_NODE ? (currentNode as Element) : currentNode.parentElement;
}

function unwrapElement(element: Element | null) {
  if (!element?.parentNode) {
    return;
  }

  const parent = element.parentNode;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

export function BbcodeEditor({ helper, label, onChange, value }: BbcodeEditorProps) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorShellRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const initialValueRef = useRef(value ?? "");
  const onChangeRef = useRef(onChange);
  const lastEditorValueRef = useRef(value ?? "");

  useEffect(() => {
    const editorApi = getEditorApi();
    const ruLocale = editorApi.locale?.ru;

    if (!ruLocale) {
      return;
    }

    ruLocale["URL:"] = "Ссылка:";
    ruLocale["Description (optional):"] = "Текст ссылки (необязательно):";
    ruLocale.Insert = "Вставить";
    ruLocale["Insert a link"] = "Вставить ссылку";
    ruLocale["Remove Formatting"] = "Очистить форматирование";

    editorApi.command?.set("removeformat", {
      exec(this: EditorInstance) {
        this.execCommand("removeformat");

        if (this.inSourceMode()) {
          return;
        }

        const currentElement = getCurrentElement(this);

        unwrapElement(currentElement?.closest("blockquote") ?? null);
        unwrapElement(currentElement?.closest("pre") ?? null);
        unwrapElement(currentElement?.closest("code") ?? null);
      },
      tooltip: "Remove Formatting",
    });

    editorApi.command?.set("link", {
      exec(this: EditorInstance, caller: HTMLElement) {
        const content = document.createElement("div");
        const urlLabel = document.createElement("label");
        const urlInput = document.createElement("input");
        const descLabel = document.createElement("label");
        const descInput = document.createElement("input");
        const submitButton = document.createElement("button");

        urlLabel.textContent = "Ссылка:";
        urlInput.type = "text";
        descLabel.textContent = "Текст ссылки (необязательно):";
        descInput.type = "text";
        submitButton.type = "button";
        submitButton.className = "button";
        submitButton.textContent = "Вставить";

        content.append(urlLabel, urlInput, descLabel, descInput, submitButton);

        const insertLink = (event: Event) => {
          const url = urlInput.value.trim();
          const text = descInput.value.trim() || url;

          if (!url) {
            this.closeDropDown(true);
            event.preventDefault();
            return;
          }

          this.focus();

          if (this.inSourceMode()) {
            this.sourceEditorInsertText(`[url=${url}]${text}[/url]`);
          } else {
            this.wysiwygEditorInsertHtml(`<a href="${escapeHtml(url)}">${escapeHtml(text)}</a>`);
          }

          this.closeDropDown(true);
          event.preventDefault();
        };

        submitButton.addEventListener("click", insertLink);
        content.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            insertLink(event);
          }
        });

        this.createDropDown(caller, "insertlink", content);
        queueMicrotask(() => {
          urlInput.focus();
        });
      },
      tooltip: "Insert a link",
    });
  }, []);

  const syncContentTheme = useEffectEvent(() => {
    const shell = editorShellRef.current;
    const iframe = shell?.querySelector("iframe");

    if (!iframe?.contentDocument) {
      return;
    }

    const rootStyles = getComputedStyle(document.documentElement);
    const contentDocument = iframe.contentDocument;
    const themeStyleId = "melodytrack-bbcode-theme";
    const existingStyle = contentDocument.getElementById(themeStyleId);
    const themeStyle = existingStyle ?? contentDocument.createElement("style");

    themeStyle.id = themeStyleId;
    themeStyle.textContent = `
      :root {
        --mt-editor-bg: ${rootStyles.getPropertyValue("--bg-elevated").trim()};
        --mt-editor-text: ${rootStyles.getPropertyValue("--text-main").trim()};
        --mt-editor-muted: ${rootStyles.getPropertyValue("--text-muted").trim()};
        --mt-editor-border-strong: ${rootStyles.getPropertyValue("--border-strong").trim()};
        --mt-editor-card: ${rootStyles.getPropertyValue("--bg-card").trim()};
        --mt-editor-accent: ${rootStyles.getPropertyValue("--accent").trim()};
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: var(--mt-editor-bg);
        color: var(--mt-editor-text);
      }

      body {
        font:
          400 15px / 1.6 "Segoe UI",
          "Noto Sans",
          sans-serif;
        padding: 14px 16px;
      }

      p,
      ul,
      ol,
      blockquote,
      pre {
        margin: 0 0 12px;
      }

      blockquote {
        border-left: 3px solid var(--mt-editor-border-strong);
        margin: 0 0 12px;
        margin-inline: 0;
        padding-left: 10px;
        color: var(--mt-editor-muted);
      }

      code,
      pre {
        font-family: "JetBrainsMono Nerd Font Mono", "JetBrains Mono", "Fira Code", monospace;
      }

      pre {
        margin: 0 0 12px;
        background: var(--mt-editor-card);
        border-radius: 12px;
        padding: 12px;
        white-space: pre-wrap;
      }

      a {
        color: var(--mt-editor-accent);
      }
    `;

    if (!existingStyle) {
      contentDocument.head.append(themeStyle);
    }
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea || editorRef.current) {
      return;
    }

    const editorApi = getEditorApi();

    editorApi.create(textarea, {
      autoUpdate: true,
      emoticonsEnabled: false,
      format: "bbcode",
      height: 240,
      icons: "material",
      locale: "ru",
      resizeEnabled: false,
      toolbar: "bold,italic,underline,strike,removeformat|bulletlist,orderedlist|quote,code|link,unlink|source",
      width: "100%",
    });

    const editor = editorApi.instance(textarea);

    if (!editor) {
      return;
    }

    editorRef.current = editor;
    lastEditorValueRef.current = initialValueRef.current;
    editor.val(lastEditorValueRef.current);

    const syncValue = () => {
      const nextValue = editor.val();
      lastEditorValueRef.current = nextValue;
      onChangeRef.current(nextValue);
    };

    editor.bind("valuechanged", syncValue);
    syncContentTheme();

    const iframe = editorShellRef.current?.querySelector("iframe");
    iframe?.addEventListener("load", syncContentTheme);

    const themeObserver = new MutationObserver(() => {
      syncContentTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme", "style"],
      attributes: true,
    });

    return () => {
      themeObserver.disconnect();
      iframe?.removeEventListener("load", syncContentTheme);
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const normalizedValue = value ?? "";

    if (!editor || lastEditorValueRef.current === normalizedValue) {
      return;
    }

    lastEditorValueRef.current = normalizedValue;
    editor.val(normalizedValue);
  }, [value]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Typography.Text strong>{label}</Typography.Text>
        <Typography.Text type="secondary">BBCode</Typography.Text>
      </div>
      <div className={styles.editorShell} ref={editorShellRef}>
        <textarea id={textareaId} ref={textareaRef} defaultValue={value ?? ""} />
      </div>
      {helper ? <span className={styles.helper}>{helper}</span> : null}
    </div>
  );
}
