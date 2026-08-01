"use client";

import { CheckIcon, CopyIcon, EyeOffIcon, ViewIcon } from "lucide-react";
import React, { ChangeEvent, ComponentProps, useEffect, useState } from "react";
import { RegisterOptions, useController, useFormContext } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupTextarea } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

interface HiddenTextAreaInputProps extends Omit<ComponentProps<"textarea">, "defaultValue"> {
  name?: string;
  label?: string;
  show?: boolean;
  rules?: RegisterOptions;
  shouldUnregister?: boolean;
  defaultValue?: string;
  classes?: {
    root?: string;
    label?: string;
    input?: string;
  };
}

const HiddenTextAreaInput: React.FC<HiddenTextAreaInputProps> = ({
  show = false,
  className,
  classes,
  name,
  label,
  rules,
  shouldUnregister,
  defaultValue,
  disabled,
  onChange,
  ...others
}) => {
  const [showContent, setShowContent] = useState<boolean>(show);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShowContent(show);
  }, [show]);

  const { control } = useFormContext();
  const { field, fieldState } = useController({ name: name!, control, rules, shouldUnregister, defaultValue: defaultValue ?? "", disabled });

  const handleCopy = () => {
    if (field.value) {
      navigator.clipboard.writeText(String(field.value)).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // In view mode (disabled) with content hidden: use masked div
  // because <textarea> does not support type="password"
  const showMasked = disabled && !showContent;

  return (
    <Field className={cn("flex w-full flex-col items-start gap-1", className, classes?.root)} data-invalid={fieldState.invalid}>
      {label && (
        <FieldLabel className={classes?.label} htmlFor={`text-area-input-${name}`}>
          {label}
        </FieldLabel>
      )}
      <InputGroup>
        <InputGroupAddon align="block-start" className="justify-end gap-2">
          <button type="button" className="cursor-pointer text-muted-foreground hover:text-foreground" onClick={handleCopy}>
            {copied ? <CheckIcon className="size-4 text-green-500" /> : <CopyIcon className="size-4" />}
          </button>
          <button type="button" className="cursor-pointer text-muted-foreground hover:text-foreground" onClick={() => setShowContent(!showContent)}>
            {showContent ? <ViewIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
          </button>
        </InputGroupAddon>
        {showMasked ? (
          <div data-slot="input-group-control" id={`text-area-input-${name}`} className={cn("min-h-10 flex-1 select-none px-3 py-2 text-sm text-muted-foreground", classes?.input)}>
            ••••••••
          </div>
        ) : (
          <InputGroupTextarea
            {...others}
            {...field}
            id={`text-area-input-${name}`}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              field.onChange(e);
              (onChange as any)?.(e);
            }}
            className={classes?.input}
            aria-invalid={fieldState.invalid}
          />
        )}
      </InputGroup>
      {fieldState.error && <FieldError errors={[fieldState.error]} />}
    </Field>
  );
};

export default HiddenTextAreaInput;
