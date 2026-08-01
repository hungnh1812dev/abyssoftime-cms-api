import React, { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import HiddenTextInput from "@/components/ui-cms/hidden-text-input/HiddenTextInput";
import PanelItem from "@/components/ui-cms/panel-item/PanelItem";
import SelectInput from "@/components/ui-cms/select-input/SelectInput";
import TextAreaInput from "@/components/ui-cms/text-area-input/TextAreaInput";
import TextInput from "@/components/ui-cms/text-input/TextInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { emptySecretEntry as initialSecretData, type SecretEntry as SecretDataType } from "@/views/secret/secret.types";

import styles from "./AccountDetails.module.css";

interface AccountDetailsProps {
  data: Map<string, SecretDataType> | null;
  onChange?: (data: Map<string, SecretDataType>) => void;
}

const AccountDetails: React.FC<AccountDetailsProps> = ({ onChange, data: initData = new Map<string, SecretDataType>() }) => {
  const accountFormMethods = useForm<SecretDataType>();
  const [creating, setCreating] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);
  const [data, setData] = useState<Map<string, SecretDataType> | null>(initData);
  const [selectedAccountKey, setSelectedAccountKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    setData(initData);
  }, [initData]);

  useEffect(() => {
    if (onChange && data) {
      onChange(data);
    }
  }, [data, onChange]);

  const handleAccountChange = (account: SecretDataType) => {
    setData((prevData) => {
      const newData = new Map(prevData);
      if (!account.createdAt) {
        account.createdAt = new Date().toISOString();
        account.updatedAt = account.createdAt;
      } else {
        account.updatedAt = new Date().toISOString();
      }
      if (!account.uuid) {
        account.uuid = uuidv4();
      }
      newData.set(account.uuid, account);
      return newData;
    });
    accountFormMethods.reset(account);

    setSelectedAccountKey(account.uuid);
    setCreating(false);
    setEditing(false);
    toast.success("Đã lưu account thành công!");
  };

  const handleConfirmDelete = () => {
    setData((prevData) => {
      const newData = new Map(prevData);
      newData.delete(selectedAccountKey || "");
      return newData;
    });
    accountFormMethods.reset(initialSecretData);
    setSelectedAccountKey(null);
    setShowDeleteDialog(false);
  };

  const accountOptions = Array.from(data?.values() || [])
    .filter((a) => !searchQuery || a.key.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map((a) => ({ label: `${a.key} - ${a.name}`, value: a.uuid }));

  return (
    <Card className="w-full bg-foreground/5">
      <CardHeader className="flex-row">
        <div className="flex-1">
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account</CardDescription>
        </div>
        <div className="flex gap-4">
          <Button
            className="bg-blue-800 hover:bg-blue-700/85"
            disabled={creating || editing}
            onClick={() => {
              setCreating(true);
              setSearchQuery("");
              accountFormMethods.reset(initialSecretData);
            }}>
            Add Account
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PanelItem>
          <div className="md:col-span-2">
            <Input
              placeholder="Tìm kiếm theo key hoặc tên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!data || data.size === 0 || creating || editing}
            />
          </div>
          <SelectInput
            name="account"
            label="Account"
            placeholder="Select your account"
            options={accountOptions}
            onChange={(value) => {
              const account = data?.get(value);
              if (account) {
                accountFormMethods.reset(account);
                setSelectedAccountKey(value);
                setCreating(false);
                setEditing(false);
              }
            }}
            value={selectedAccountKey || ""}
            disabled={!data || data.size === 0 || creating || editing}
          />
        </PanelItem>
        <FormProvider {...accountFormMethods}>
          <form className="grid gap-4" onSubmit={accountFormMethods.handleSubmit(handleAccountChange)}>
            <PanelItem>
              <TextInput name="key" disabled={!creating && !editing} rules={{ required: true }} label="Account Key" type="text" placeholder="Enter your account key" />
              <HiddenTextInput
                name="name"
                disabled={!creating && !editing}
                rules={{ required: true }}
                label="Account Name"
                type="text"
                autoComplete="new-password"
                placeholder="Enter your account name"
              />
            </PanelItem>
            <PanelItem>
              <HiddenTextInput
                name="email"
                disabled={!creating && !editing}
                rules={{ required: true }}
                label="Account Email"
                autoComplete="new-password"
                placeholder="Enter your account email"
              />
              <HiddenTextInput name="secret" disabled={!creating && !editing} rules={{ required: true }} label="Account Secret" placeholder="Enter your account secret" />
            </PanelItem>
            <PanelItem>
              <TextAreaInput
                name="notes"
                className="md:col-span-2"
                disabled={!creating && !editing}
                label="Account Notes"
                autoComplete="new-password"
                placeholder="Enter your account notes"
                rows={4}
              />
            </PanelItem>
            <div className="flex justify-end gap-4">
              {editing || creating ? (
                <Button
                  variant="destructive"
                  className="min-w-36"
                  onClick={() => {
                    setEditing(false);
                    setCreating(false);
                  }}>
                  Cancel
                </Button>
              ) : (
                <Button variant="destructive" disabled={!selectedAccountKey} className="min-w-36" onClick={() => setShowDeleteDialog(true)}>
                  Delete
                </Button>
              )}
              {editing || creating ? (
                <Button type="submit" className="min-w36">
                  Save Account
                </Button>
              ) : (
                <Button
                  disabled={!selectedAccountKey}
                  className="min-w-36"
                  onClick={(e) => {
                    setEditing(true);
                    e.preventDefault();
                  }}>
                  Edit Account
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>Bạn có chắc muốn xóa account này? Hành động này không thể hoàn tác.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AccountDetails;
