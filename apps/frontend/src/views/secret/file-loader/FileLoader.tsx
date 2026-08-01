import React, { ChangeEvent, useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import HiddenTextInput from "@/components/ui-cms/hidden-text-input/HiddenTextInput";
import JsonInput from "@/components/ui-cms/json-input/JsonInput";
import PanelItem from "@/components/ui-cms/panel-item/PanelItem";
import TextInput from "@/components/ui-cms/text-input/TextInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aesCrypto } from "@/lib/crypto";
import { decryptFileContent, encryptFileContent, generateSecretFilename } from "@/views/secret/file-loader/useSecretFile";
import { parseRawToSecretMap, reEncodeSecretData } from "@/views/secret/file-loader/useSecretProcessor";
import type { SecretEntry as SecretDataType } from "@/views/secret/secret.types";

import styles from "./FileLoader.module.css";

interface FileLoaderProps {
  onFileChange?: (content: Map<string, SecretDataType> | null) => void;
  onError?: (error: Error) => void;
  data?: Map<string, SecretDataType> | null;
}

const FileLoader: React.FC<FileLoaderProps> = ({ onFileChange, onError, data }) => {
  const [file, setFile] = useState<File | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const fileFormMethods = useForm<{ filePassword: string; fileName: string }>();
  const encryptFormMethods = useForm<{ encodePassword: string; raw: string }>();
  const filePassword = useWatch({ control: fileFormMethods.control, name: "filePassword" });
  const encodePassword = useWatch({ control: encryptFormMethods.control, name: "encodePassword" });
  const raw = useWatch({ control: encryptFormMethods.control, name: "raw" });
  const { setValue } = encryptFormMethods;

  useEffect(() => {
    if (data) {
      const encoded = reEncodeSecretData(data, encodePassword || "", aesCrypto);
      setValue("raw", encoded, { shouldDirty: false });
    }
  }, [data, encodePassword, setValue]);

  const handleLoadFileContent = (formData: { filePassword: string; fileName: string }) => {
    if (!file) {
      setValue("raw", "[]", { shouldDirty: false });
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = (evt) => {
      const fileContent = evt.target?.result;
      if (typeof fileContent === "string") {
        try {
          const content = decryptFileContent(fileContent, formData.filePassword, aesCrypto);
          if (!content) {
            setProcessError("Không thể giải mã file. Kiểm tra lại mật khẩu.");
            return;
          }
          setProcessError(null);
          setValue("raw", content, { shouldDirty: false });
        } catch (error) {
          console.log("Error decrypting file content:", error);
          setProcessError("Không thể giải mã file. Kiểm tra lại mật khẩu.");
          onError?.(new Error("File content is not valid JSON"));
        }
      }
    };
    fileReader.readAsText(file!);
  };

  const handleProcessData = (formData: { encodePassword: string; raw: string }) => {
    try {
      const dataMap = parseRawToSecretMap(formData.raw, formData.encodePassword, aesCrypto);
      setProcessError(null);
      onFileChange?.(dataMap);
    } catch {
      setProcessError("Dữ liệu JSON không hợp lệ. Kiểm tra lại nội dung.");
    }
  };

  const saveToFile = () => {
    const blob = new Blob([encryptFileContent(raw, filePassword, aesCrypto)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateSecretFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    fileFormMethods.reset(fileFormMethods.getValues());
    encryptFormMethods.reset(encryptFormMethods.getValues());
  };

  return (
    <Card className="w-full bg-foreground/5">
      <CardHeader>
        <CardTitle>File</CardTitle>
        <CardDescription>Load your data file</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FormProvider {...fileFormMethods}>
          <form onSubmit={fileFormMethods.handleSubmit(handleLoadFileContent)}>
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setFile(e.target?.files?.[0] || null);
                }}
                disabled={!filePassword}
              />
            </PanelItem>
            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={!filePassword}>
                Load Content
              </Button>
            </div>
          </form>
        </FormProvider>
        <FormProvider {...encryptFormMethods}>
          <form className="flex flex-col gap-4">
            <PanelItem>
              <HiddenTextInput name="encodePassword" label="Encode Password" placeholder="Enter password for encode raw" helperText="Mật khẩu để mã hóa dữ liệu khi tải xuống" />
              <div className="flex items-end justify-end gap-4">
                <Button
                  onClick={(e) => {
                    saveToFile();
                    e.preventDefault();
                  }}
                  disabled={!filePassword}>
                  Download
                </Button>
                <Button type="button" disabled={!encodePassword || !raw} onClick={() => handleProcessData({ encodePassword, raw })}>
                  Process
                </Button>
              </div>
            </PanelItem>
            <JsonInput name="raw" label="Raw Data" placeholder="Raw data in JSON format" />
            {processError && (
              <Alert variant="destructive">
                <AlertDescription>{processError}</AlertDescription>
              </Alert>
            )}
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default FileLoader;
