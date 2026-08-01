import { TextInputProps } from "../text-input/TextInput";
import { CheckIcon, CopyIcon, EyeOffIcon, ViewIcon } from "lucide-react";
import React, { ChangeEvent, useEffect, useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export interface HiddenTextInputDataType {}

interface HiddenTextInputProps extends TextInputProps {
  show?: boolean;
  helperText?: string;
}

const HiddenTextInput: React.FC<HiddenTextInputProps> = ({
  show = false,
  helperText,
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

  return (
    <Field className={cn("flex w-full flex-col items-start gap-1", className, classes?.root)} data-invalid={fieldState.invalid}>
      {label && (
        <FieldLabel className={classes?.label} htmlFor={`text-input-${name}`}>
          {label}
        </FieldLabel>
      )}
      <InputGroup>
        <Input
          {...others}
          {...field}
          data-slot="input-group-control"
          id={`text-input-${name}`}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            field.onChange(e);
            onChange?.(e);
          }}
          type={showContent ? "text" : "password"}
          className={cn("flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent", classes?.input)}
          aria-invalid={fieldState.invalid}
        />
        <InputGroupAddon align="inline-end">
          <div className="mr-1 cursor-pointer text-muted-foreground hover:text-foreground" onClick={handleCopy}>
            {copied ? <CheckIcon className="h-auto w-3/4 text-green-500" /> : <CopyIcon className="h-auto w-3/4" />}
          </div>
          <div className="cursor-pointer" onClick={() => setShowContent(!showContent)}>
            {showContent ? <ViewIcon /> : <EyeOffIcon className="h-auto w-3/4" />}
          </div>
        </InputGroupAddon>
      </InputGroup>
      {fieldState.error && <FieldError errors={[fieldState.error]} />}
      {helperText && <FieldDescription>{helperText}</FieldDescription>}
    </Field>
  );
};

export default HiddenTextInput;
