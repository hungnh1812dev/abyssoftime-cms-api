"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { verifyPasscode } from "@/app/actions/app-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SESSION_STORAGE_KEY } from "@/libs/session";

interface AuthPageProps {
  returnTo: string;
}

const AuthPage = ({ returnTo }: AuthPageProps) => {
  const [state, formAction, isPending] = useActionState(verifyPasscode, null);
  const router = useRouter();

  useEffect(() => {
    if (state && "token" in state) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, state.token);
      router.push(returnTo);
    }
  }, [state, router, returnTo]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <Lock className="h-8 w-8 text-foreground/40" />
          </div>
          <CardTitle>Xác thực</CardTitle>
          <CardDescription>Nhập passcode để tiếp tục</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-3">
            <Input type="password" name="passcode" placeholder="••••••" autoFocus autoComplete="off" />
            {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Đang kiểm tra..." : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
