"use client";

import React, { ChangeEvent, ComponentProps } from "react";
import { RegisterOptions, useController, useFormContext } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TextInputProps extends Omit<ComponentProps<"input">, "defaultValue"> {
  name?: string;
  label?: string;
  rules?: RegisterOptions;
  shouldUnregister?: boolean;
  defaultValue?: string;
  classes?: {
    root?: string;
    label?: string;
    input?: string;
  };
}

const TextInput: React.FC<TextInputProps> = ({ className, classes, name, label, rules, shouldUnregister, defaultValue, disabled, onChange, type, ...others }) => {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: name!, control, rules, shouldUnregister, defaultValue: defaultValue ?? "", disabled });
  const { value, ...fieldWithoutValue } = field;
  const isFileInput = type === "file";

  return (
    <Field className={cn("flex w-full flex-col items-start gap-1", className, classes?.root)} data-invalid={fieldState.invalid}>
      {label && (
        <FieldLabel className={classes?.label} htmlFor={`text-input-${name}`}>
          {label}
        </FieldLabel>
      )}
      <Input
        {...others}
        {...fieldWithoutValue}
        {...(isFileInput ? {} : { value })}
        type={type}
        id={`text-input-${name}`}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          field.onChange(isFileInput ? e.target.files : e);
          onChange?.(e);
        }}
        className={classes?.input}
        aria-invalid={fieldState.invalid}
      />
      {fieldState.error && <FieldError errors={[fieldState.error]} />}
    </Field>
  );
};

export default TextInput;
