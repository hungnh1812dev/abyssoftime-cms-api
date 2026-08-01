import React, { ChangeEvent, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import HiddenTextInput from "@/components/ui-cms/hidden-text-input/HiddenTextInput";
import PanelItem from "@/components/ui-cms/panel-item/PanelItem";
import TextInput from "@/components/ui-cms/text-input/TextInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aesCrypto } from "@/lib/crypto";
import { decryptFileContent, encryptFileContent, generateTimestampedFilename } from "@/views/account/file-module/useAccountFile";

interface FileModuleProps {
  currentPreviewData: string;
  onPreviewDataLoaded: (raw: string) => void;
  onError?: (error: Error) => void;
}

const FileModule: React.FC<FileModuleProps> = ({ currentPreviewData, onPreviewDataLoaded, onError }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const formMethods = useForm<{ filePassword: string; fileName: string }>();
  const filePassword = useWatch({ control: formMethods.control, name: "filePassword" });

  const handleLoadFileContent = (formData: { filePassword: string; fileName: string }) => {
    if (!file) {
      setLoadError(null);
      onPreviewDataLoaded("[]");
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = (evt) => {
      const fileContent = evt.target?.result;
      if (typeof fileContent === "string") {
        try {
          const content = decryptFileContent(fileContent, formData.filePassword, aesCrypto);
          if (!content) {
            setLoadError("Không thể giải mã file. Kiểm tra lại mật khẩu.");
            return;
          }
          setLoadError(null);
          onPreviewDataLoaded(content);
        } catch (error) {
          console.log("Error decrypting file content:", error);
          setLoadError("Không thể giải mã file. Kiểm tra lại mật khẩu.");
          onError?.(new Error("File content is not valid"));
        }
      }
    };
    fileReader.readAsText(file);
  };

  const saveToFile = () => {
    const blob = new Blob([encryptFileContent(currentPreviewData, filePassword, aesCrypto)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateTimestampedFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    formMethods.reset(formMethods.getValues());
  };

  const canDownload = !!filePassword && currentPreviewData !== "[]" && currentPreviewData !== "";

  return (
    <Card className="w-full bg-foreground/5">
      <CardHeader>
        <CardTitle>File</CardTitle>
        <CardDescription>Load your account data file</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormProvider {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(handleLoadFileContent)} className="flex flex-col gap-4">
            <PanelItem>
              <HiddenTextInput
                name="filePassword"
                label="File Password"
                type="text"
                placeholder="Enter your file password"
                helperText="Mật khẩu để giải mã nội dung file đã upload"
              />
              <TextInput
                className="cursor-pointer"
                name="fileName"
                label="File Name"
                type="file"
                placeholder="Choose your data file"
                disabled={!filePassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setFile(e.target?.files?.[0] || null);
                }}
              />
            </PanelItem>
            {loadError && (
              <Alert variant="destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                disabled={!canDownload}
                onClick={(e) => {
                  e.preventDefault();
                  saveToFile();
                }}>
                Download File
              </Button>
              <Button type="submit" disabled={!filePassword}>
                Load Content
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default FileModule;
