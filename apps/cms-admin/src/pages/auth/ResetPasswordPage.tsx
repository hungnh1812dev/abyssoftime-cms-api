import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface ResetPasswordFields {
  newPassword: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [expired, setExpired] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetPasswordFields>();

  const newPassword = useWatch({ control, name: "newPassword" });

  const mutation = useMutation({
    mutationFn: (data: ResetPasswordFields) => api.post("/auth/reset-password", { token, newPassword: data.newPassword }),
    onSuccess: () => {
      navigate("/login");
    },
    onError: (error: unknown) => {
      if ((error as AxiosError).response?.status === 400) setExpired(true);
    },
  });

  if (!token || expired) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-6 px-4 text-center">
          <h1 className="text-2xl font-semibold">Link expired</h1>
          <p className="text-muted-foreground text-sm">This reset link is invalid or has expired. Request a new one to continue.</p>
          <Link to="/forgot-password" className="text-primary text-sm underline-offset-4 hover:underline">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Reset password</h1>
          <p className="text-muted-foreground text-sm">Choose a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.newPassword}
              {...register("newPassword", {
                required: "New password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
            />
            {errors.newPassword && <p className="text-destructive text-xs">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === newPassword || "Passwords don't match",
              })}
            />
            {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Resetting…" : "Reset password"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
