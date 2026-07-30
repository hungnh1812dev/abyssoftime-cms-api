import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/lib/errors";

interface VerifyOtpFields {
  email: string;
  otp: string;
}

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email ?? "";
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<VerifyOtpFields>({ defaultValues: { email: stateEmail, otp: "" } });

  const verifyMutation = useMutation({
    mutationFn: (data: VerifyOtpFields) => api.post("/auth/verify-otp", data),
    onSuccess: () => {
      toast.success("Email verified. You can now sign in.");
      navigate("/login");
    },
    onError: (error: unknown) => {
      setErrorMsg(apiErrorMessage(error, "Verification failed. Check the code and try again."));
    },
  });

  const resendMutation = useMutation({
    mutationFn: (email: string) => api.post("/auth/resend-otp", { email }),
    onSuccess: () => {
      toast.success("A new code has been sent.");
    },
    onError: (error: unknown) => {
      toast.error(apiErrorMessage(error, "Failed to resend the code."));
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Verify your email</h1>
          <p className="text-muted-foreground text-sm">Enter the 6-digit code we emailed you</p>
        </div>

        {errorMsg && (
          <div role="alert" className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit((data) => verifyMutation.mutate(data))} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
              })}
            />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="otp">Verification code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-invalid={!!errors.otp}
              {...register("otp", {
                required: "Verification code is required",
                pattern: { value: /^\d{6}$/, message: "Enter the 6-digit code" },
              })}
            />
            {errors.otp && <p className="text-destructive text-xs">{errors.otp.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={verifyMutation.isPending}>
            {verifyMutation.isPending ? "Verifying…" : "Verify email"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate(getValues("email"))}>
            {resendMutation.isPending ? "Sending…" : "Resend code"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Already verified?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
