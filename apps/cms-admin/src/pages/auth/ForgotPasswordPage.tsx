import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface ForgotPasswordFields {
  email: string;
}

export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFields>();

  // Always resolves to the generic success state on submit — the endpoint
  // itself always returns success regardless of whether the email exists
  // (enumeration prevention), so there is no error branch to render here.
  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFields) => api.post("/auth/forgot-password", data),
  });

  if (mutation.isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-6 px-4 text-center">
          <h1 className="text-2xl font-semibold">Check your inbox</h1>
          <p className="text-muted-foreground text-sm">If an account exists for that email, we&apos;ve sent a link to reset your password.</p>
          <Link to="/login" className="text-primary text-sm underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Forgot password</h1>
          <p className="text-muted-foreground text-sm">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4" noValidate>
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

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : "Send reset link"}
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
