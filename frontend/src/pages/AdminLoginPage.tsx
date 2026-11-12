import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { loginAdmin, fetchAdminSession } from "../api/admin";
import { ApiError } from "../api/client";
import { LoadingPanel } from "../components/StatePanel";

export function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ["admin-session"],
    queryFn: fetchAdminSession,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => loginAdmin(username, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      navigate("/admin/damage-profiles");
    },
  });

  if (session.isPending) return <LoadingPanel label="admin session" />;

  if (session.data?.username) {
    return (
      <div className="panel p-4">
        <p className="text-sm">
          Signed in as <span className="font-medium">{session.data.username}</span>.
        </p>
        <Link
          className="mt-2 inline-block text-sm text-accent underline underline-offset-2"
          to="/admin/damage-profiles"
        >
          Open admin page
        </Link>
      </div>
    );
  }

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.status === 429
        ? "Too many attempts. Try again in 15 minutes."
        : "Incorrect username or password."
      : mutation.error instanceof Error
        ? mutation.error.message
        : null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold">Admin login</h1>

      <form
        className="panel mt-4 grid gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="block text-sm">
          <span className="text-xs text-stone-600">Username</span>
          <input
            className="field mt-1 block w-full"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-stone-600">Password</span>
          <input
            className="field mt-1 block w-full"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {errorMessage ? (
          <p className="status error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <button
          className="button justify-self-start"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Checking..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
