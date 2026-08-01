import FieldController, { UseFieldControllerProps } from "../field-controller/FieldController";
import React, { useEffect } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import styles from "./SelectInput.module.css";

export interface SelectInputDataType {}

interface SelectInputProps extends UseFieldControllerProps {
  label?: string;
  className?: string;
  classes?: {
    root?: string;
    label?: string;
    trigger?: string;
    item?: string;
  };
  defaultValue?: string;
  introLabel?: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  name?: string;
  onChange?: (value: string) => void;
  value?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
  className,
  classes,
  label,
  introLabel,
  name,
  options,
  placeholder,
  rules,
  disabled,
  value,
  defaultValue,
  onChange,
  shouldUnregister,
  ...others
}) => {
  return (
    <FieldController
      name={name!}
      defaultValue={defaultValue || ""}
      rules={rules}
      shouldUnregister={shouldUnregister}
      disabled={disabled}
      render={({ field, fieldState }) => (
        <Field className={cn("grid w-full items-center gap-1", className, classes?.root)} data-invalid={fieldState.invalid}>
          {label && (
            <FieldLabel className={classes?.label} htmlFor={name}>
              {label}
            </FieldLabel>
          )}
          <Select
            {...others}
            {...field}
            value={field.value || value || ""}
            onValueChange={(value: string) => {
              field.onChange?.(value);
              onChange?.(value);
            }}
            aria-invalid={fieldState.invalid}>
            <SelectTrigger className={cn("w-full", classes?.trigger)} value={field.value || ""}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {introLabel && <SelectLabel>{introLabel}</SelectLabel>}
                {options?.map((option) => (
                  <SelectItem className={classes?.item} key={`${`${name}-`}${option.value}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};

export default SelectInput;
