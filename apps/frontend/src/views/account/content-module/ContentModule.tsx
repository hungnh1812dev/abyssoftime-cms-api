import React, { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import HiddenTextInput from "@/components/ui-cms/hidden-text-input/HiddenTextInput";
import JsonInput from "@/components/ui-cms/json-input/JsonInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aesCrypto } from "@/lib/crypto";
import type { AccountEntry } from "@/views/account/account.types";
import { mergeAndSmartUpdateRaw, parseRawToAccountMap, reEncodeAccountData } from "@/views/account/content-module/useAccountProcessor";

interface ContentModuleProps {
  sharedPreviewData: string;
  previewResetKey: number;
  accountData: Map<string, AccountEntry> | null;
  accountDataVersion: number;
  onProcessData: (data: Map<string, AccountEntry>) => void;
  onPreviewDataChange: (raw: string) => void;
}

const ContentModule: React.FC<ContentModuleProps> = ({ sharedPreviewData, previewResetKey, accountData, accountDataVersion, onProcessData, onPreviewDataChange }) => {
  const [processError, setProcessError] = useState<string | null>(null);
  const form = useForm<{ encodePassword: string; raw: string }>({
    defaultValues: { encodePassword: "", raw: "[]" },
  });
  const raw = useWatch({ control: form.control, name: "raw" });
  const encodePassword = useWatch({ control: form.control, name: "encodePassword" });

  // File inject: khi previewResetKey tăng → reset form với raw mới, clear dirty
  useEffect(() => {
    if (previewResetKey === 0) return;
    form.reset({ encodePassword: form.getValues("encodePassword"), raw: sharedPreviewData });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewResetKey, sharedPreviewData]);

  // Account inject: khi accountDataVersion tăng → smart merge + reset, clear dirty
  useEffect(() => {
    if (accountDataVersion === 0 || !accountData) return;
    const encPw = form.getValues("encodePassword");
    const currentRaw = form.getValues("raw");
    const newRaw = mergeAndSmartUpdateRaw(currentRaw, accountData, encPw, aesCrypto);
    form.reset({ encodePassword: encPw, raw: newRaw });
    onPreviewDataChange(newRaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountDataVersion]);

  // encodePassword thay đổi khi có accountData → full re-encode (user action → dirty=true)
  useEffect(() => {
    if (!accountData || accountData.size === 0) return;
    const encoded = reEncodeAccountData(accountData, encodePassword || "", aesCrypto);
    form.setValue("raw", encoded, { shouldDirty: true });
    onPreviewDataChange(encoded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encodePassword]);

  const handleProcess = () => {
    const currentRaw = form.getValues("raw");
    const encPw = form.getValues("encodePassword");
    try {
      const dataMap = parseRawToAccountMap(currentRaw, encPw, aesCrypto);
      setProcessError(null);
      onProcessData(dataMap);
    } catch {
      setProcessError("Dữ liệu JSON không hợp lệ. Kiểm tra lại nội dung.");
    }
  };

  const hasPreviewData = raw && raw !== "[]" && raw !== "";

  return (
    <Card className="w-full bg-foreground/5">
      <CardHeader>
        <CardTitle>Content</CardTitle>
        <CardDescription>Preview and process account data</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormProvider {...form}>
          <form className="flex flex-col gap-4">
            <HiddenTextInput name="encodePassword" label="Encode Password" placeholder="Enter password for encoding" helperText="Mật khẩu để mã hóa dữ liệu" />
            <JsonInput name="raw" label="Preview Data" placeholder="[]" readOnly />
            {processError && (
              <Alert variant="destructive">
                <AlertDescription>{processError}</AlertDescription>
              </Alert>
            )}
            {hasPreviewData && (
              <div className="flex justify-end">
                <Button type="button" onClick={handleProcess}>
                  Process
                </Button>
              </div>
            )}
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default ContentModule;
