import React, { memo } from "react";
import { Controller, ControllerProps, UseControllerProps, useFormContext } from "react-hook-form";

type FieldControllerProps = Omit<ControllerProps, "control">;
export type UseFieldControllerProps = Omit<UseControllerProps, "name" | "control">;

const FieldController: React.FC<FieldControllerProps> = (props) => {
  const form = useFormContext();

  return form ? (
    <Controller control={form.control} {...props} />
  ) : (
    props.render({
      field: { name: props.name, defaultValue: props.defaultValue, disabled: props.disabled } as any,
      fieldState: {} as any,
      formState: {} as any,
    })
  );
};

export default memo(FieldController);
