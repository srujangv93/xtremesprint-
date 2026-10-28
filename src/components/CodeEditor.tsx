"use client";

import React, { useState, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isFocused, setIsFocused] = useState(false);

  // Line count
  const lineCount = value.split("\n").length;

  // Language extension selector
  const extensions = useMemo(() => {
    const exts = [
      EditorView.theme({
        "&": {
          height: "100%",
          fontSize: "14.5px",
          backgroundColor: "#0d0d12",
        },
        ".cm-scroller": {
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
          lineHeight: "1.65",
          overflow: "auto",
        },
        ".cm-content": {
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
          paddingTop: "14px",
          paddingBottom: "80px",
          caretColor: "#34d399",
        },
        ".cm-gutters": {
          backgroundColor: "#09090d",
          color: "#4e4e5d",
          borderRight: "1px solid #1a1a24",
          paddingTop: "14px",
          paddingBottom: "80px",
          userSelect: "none",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "transparent",
          color: "#fafafa",
          fontWeight: "700",
        },
        ".cm-activeLine": {
          backgroundColor: "rgba(255, 255, 255, 0.03)",
        },
        ".cm-selectionMatch": {
          backgroundColor: "rgba(255, 255, 255, 0.08)",
        },
        "&.cm-focused .cm-cursor": {
          borderLeftColor: "#34d399",
          borderLeftWidth: "2px",
        },
      }),
    ];

    switch (language) {
      case "python":
        exts.push(python());
        break;
      case "java":
        exts.push(java());
        break;
      case "cpp":
        exts.push(cpp());
        break;
      case "javascript":
        exts.push(javascript());
        break;
      default:
        break;
    }

    return exts;
  }, [language]);

  const handleUpdate = (update: any) => {
    if (update.selectionSet || update.docChanged) {
      const state = update.state;
      const head = state.selection.main.head;
      const line = state.doc.lineAt(head);
      setCursorPos({
        line: line.number,
        col: head - line.from + 1,
      });
    }
  };

  const getFilename = () => {
    switch (language) {
      case "python":
        return "solution.py";
      case "java":
        return "Main.java";
      case "cpp":
        return "solution.cpp";
      case "javascript":
        return "solution.js";
      default:
        return "solution.txt";
    }
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[#0d0d12] border-l border-[#1f1f24] min-h-0 overflow-hidden">
      {/* Editor Header Tab */}
      <div className="bg-[#101015] border-b border-[#1f1f24] px-4 py-2 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isFocused ? "bg-emerald-400" : "bg-zinc-600"}`} />
          <span className="font-mono text-xs text-zinc-300 font-medium tracking-wide">
            {getFilename()}
          </span>
        </div>
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
          {language} · UTF-8
        </span>
      </div>

      {/* Editor Body - Powered by unified CodeMirror Virtual DOM */}
      <div className="flex-1 w-full h-full min-h-0 overflow-hidden bg-[#0d0d12]">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={(val) => onChange(val)}
          onUpdate={handleUpdate}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: false,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: false,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: false,
            completionKeymap: true,
            lintKeymap: false,
            tabSize: 4,
          }}
          className="h-full"
        />
      </div>

      {/* Editor Footer Status Bar */}
      <div className="bg-[#101015] border-t border-[#1f1f24] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <span>
            Ln <strong className="text-zinc-200">{cursorPos.line}</strong>, Col <strong className="text-zinc-200">{cursorPos.col}</strong>
          </span>
          <span>&middot;</span>
          <span>{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Spaces: 4</span>
          <span className={isFocused ? "text-emerald-400" : "text-zinc-500"}>
            &bull; {isFocused ? "Editing" : "Ready"}
          </span>
        </div>
      </div>
    </div>
  );
}
