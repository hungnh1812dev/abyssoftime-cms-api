import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface RegisterFields {
  name: string;
  email: string;
  username: string;
  password: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFields>();

  const mutation = useMutation({
    mutationFn: (data: RegisterFields) =>
      // accountType isn't surfaced in the UI — its semantics aren't documented
      // (only the first-ever OTP verifier becomes super_admin, everyone else
      // gets the guest role, regardless of this value), so it's sent as a fixed true.
      api.post("/auth/register", { ...data, accountType: true }),
    onSuccess: (_response, variables) => {
      navigate("/verify-otp", { state: { email: variables.email } });
    },
    onError: () => {
      setErrorMsg("Registration failed. The email or username may already be in use.");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Create an account</h1>
          <p className="text-muted-foreground text-sm">Sign up to get started</p>
        </div>

        {errorMsg && (
          <div role="alert" className="border-destructive/50 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              aria-invalid={!!errors.name}
              {...register("name", {
                required: "Display name is required",
                maxLength: { value: 100, message: "Display name must be at most 100 characters" },
              })}
            />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              aria-invalid={!!errors.username}
              {...register("username", {
                required: "Username is required",
                pattern: { value: /^[a-zA-Z0-9_.-]+$/, message: "Only letters, numbers, underscore, dot, and hyphen are allowed" },
                minLength: { value: 3, message: "Username must be at least 3 characters" },
                maxLength: { value: 32, message: "Username must be at most 32 characters" },
              })}
            />
            {errors.username && <p className="text-destructive text-xs">{errors.username.message}</p>}
          </div>

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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
            />
            {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
