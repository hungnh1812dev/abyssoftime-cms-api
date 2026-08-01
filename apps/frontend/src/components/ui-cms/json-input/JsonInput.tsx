import { closeBrackets } from "@codemirror/autocomplete";
import { json } from "@codemirror/lang-json";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { EditorState, Extension } from "@codemirror/state";
import { drawSelection, dropCursor, EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import React from "react";
import { RegisterOptions, useController, useFormContext } from "react-hook-form";

import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface JsonInputProps {
  name?: string;
  label?: string;
  className?: string;
  classes?: {
    root?: string;
    label?: string;
    input?: string;
  };
  rules?: RegisterOptions;
  shouldUnregister?: boolean;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

const jsonTheme = EditorView.theme(
  {
    "&": {
      color: "hsl(var(--foreground))",
      backgroundColor: "hsl(var(--background))",
    },
    ".cm-content": {
      caretColor: "hsl(var(--foreground))",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--muted))",
      color: "hsl(var(--muted-foreground))",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--accent))",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--accent))",
    },
    ".cm-scroller": {
      fontFamily: "var(--font-mono)", // Use the mono font from your globals.css
      border: "1px solid hsl(var(--border))",
      borderRadius: "calc(var(--radius) - 2px)",
      maxWidth: "100%",
    },
    ".cm-selectionBackground": {
      backgroundColor: "hsl(var(--primary) / 0.3)", // Using opacity
    },
  },
  { dark: false }, // Set to true if you are basing this on a light theme
);

const JsonInput: React.FC<JsonInputProps> = ({ className, classes, label, name, rules, disabled, defaultValue, onChange, readOnly, shouldUnregister }) => {
  const extensions: Extension[] = [
    json(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    jsonTheme,
    EditorView.lineWrapping,
    ...(readOnly ? [EditorState.readOnly.of(true)] : []),
  ];

  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: name!, control, rules, shouldUnregister, defaultValue: defaultValue ?? "", disabled });

  return (
    <Field className={cn("grid w-full max-w-full items-center gap-1", className, classes?.root)} data-invalid={fieldState.invalid}>
      {label && (
        <FieldLabel className={classes?.label} htmlFor={name}>
          {label}
        </FieldLabel>
      )}
      <CodeMirror
        value={field.value || "null"}
        height="300px"
        width="100%"
        extensions={extensions}
        className={cn("text-sm", classes?.input)}
        onChange={(val) => {
          field.onChange(val);
          onChange?.(val);
        }}
      />
    </Field>
  );
};

export default JsonInput;
