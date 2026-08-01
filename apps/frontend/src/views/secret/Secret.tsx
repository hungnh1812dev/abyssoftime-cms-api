"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import type { SecretEntry as SecretDataType } from "@/views/secret/secret.types";

import AccountDetails from "./account-details/AccountDetails";
import FileLoader from "./file-loader/FileLoader";

const Secret: React.FC = () => {
  const [data, setData] = useState<Map<string, SecretDataType> | null>(null);

  const { showWarning, countdown, extendSession } = useSessionTimeout({
    enabled: !!data,
    onExpire: () => setData(null),
  });

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4 rounded-sm border-solid border-border p-4">
        <FileLoader
          onFileChange={(content) => {
            if (content) {
              setData(content);
            }
          }}
          data={data}
        />
        <AccountDetails data={data} onChange={setData} />
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

export default Secret;
