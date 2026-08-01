"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import type { AccountEntry as AccountDataType } from "@/views/account/account.types";

import AccountModule from "./account-module/AccountModule";
import ContentModule from "./content-module/ContentModule";
import FileModule from "./file-module/FileModule";

const AccountManager: React.FC = () => {
  const [accountData, setAccountData] = useState<Map<string, AccountDataType> | null>(null);
  const [accountDataVersion, setAccountDataVersion] = useState(0);
  const [sharedPreviewData, setSharedPreviewData] = useState("[]");
  const [previewResetKey, setPreviewResetKey] = useState(0);

  const { showWarning, countdown, extendSession } = useSessionTimeout({
    enabled: !!accountData,
    onExpire: () => {
      setAccountData(null);
      setSharedPreviewData("[]");
      setPreviewResetKey((k) => k + 1);
    },
  });

  const handlePreviewDataLoaded = (raw: string) => {
    setSharedPreviewData(raw);
    setPreviewResetKey((k) => k + 1);
  };

  const handleProcessData = (data: Map<string, AccountDataType>) => {
    // Strip isModified sau khi Process
    const cleanMap = new Map(
      Array.from(data.entries()).map(([k, v]) => {
        const { isModified, ...rest } = v;
        return [k, rest];
      }),
    );
    setAccountData(cleanMap);
  };

  const handleAccountDataChange = (data: Map<string, AccountDataType>) => {
    setAccountData(data);
    setAccountDataVersion((v) => v + 1);
  };

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4 rounded-sm border-solid border-border p-4">
        <FileModule currentPreviewData={sharedPreviewData} onPreviewDataLoaded={handlePreviewDataLoaded} />
        <ContentModule
          sharedPreviewData={sharedPreviewData}
          previewResetKey={previewResetKey}
          accountData={accountData}
          accountDataVersion={accountDataVersion}
          onProcessData={handleProcessData}
          onPreviewDataChange={setSharedPreviewData}
        />
        <AccountModule data={accountData} onChange={handleAccountDataChange} />
      </div>
      <Dialog open={showWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phiên sắp hết hạn</DialogTitle>
            <DialogDescription>Phiên làm việc sẽ kết thúc sau {countdown} giây. Dữ liệu sẽ bị xóa để bảo mật.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={extendSession}>Gia hạn phiên</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountManager;
