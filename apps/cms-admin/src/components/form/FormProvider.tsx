import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useEffect } from "react";
import { FormProvider as RHFFormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormStateContext } from "./FormStateContext";

interface CmsFormProviderProps {
  query?: UseQueryOptions;
  values?: Record<string, unknown>;
  mutationFn: (data: Record<string, unknown>) => Promise<unknown>;
  onSuccess?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  children: React.ReactNode;
}

export function FormProvider({ query, values: externalValues, mutationFn, onSuccess, onDirtyChange, children }: CmsFormProviderProps) {
  const queryClient = useQueryClient();

  const { data: queryData, isFetching } = useQuery(query ?? { queryKey: ["__noop__"], queryFn: () => null, enabled: false });

  const methods = useForm({
    values: externalValues ?? (queryData as Record<string, unknown>) ?? {},
  });

  const { isDirty } = methods.formState;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const { mutate, isPending } = useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success("Saved");
      methods.reset(methods.getValues());
      if (query?.queryKey) {
        queryClient.invalidateQueries({ queryKey: query.queryKey as readonly unknown[] });
      }
      onSuccess?.();
    },
    onError: (err: unknown) => {
      const msg = (err as AxiosError<{ error: string }>).response?.data?.error ?? "Something went wrong";
      toast.error(msg);
    },
  });

  function onSubmit(values: Record<string, unknown>) {
    mutate(values);
  }

  return (
    <FormStateContext.Provider value={{ loading: isFetching, submitting: isPending, isDirty }}>
      <RHFFormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)}>{children}</form>
      </RHFFormProvider>
    </FormStateContext.Provider>
  );
}
