"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(mode === "signup");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Handle Email & Password Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMessage("Account created! Check your email to confirm sign up.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push("/"); // Redirect home on success
        router.refresh();
      }
    }
    setLoading(false);
  };

  // Handle OAuth Sign-in (Google / Apple)
  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16 sm:py-24">
      {/* Top Header */}
      <div className="mb-8 text-center">
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.3em] text-gold hover:underline">
          ← 歌学 — Uta Learn
        </Link>
        <h1 className="mt-4 font-display text-3xl text-paper">{isSignUp ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-xs text-paper/60">
          {isSignUp
            ? "Sign up to collect vocabulary and upload custom tracks."
            : "Sign in to access your saved vocabulary and progress."}
        </p>
      </div>

      {/* Auth Card */}
      <div className="rounded-xl border border-paper/10 bg-paper/5 p-6 sm:p-8">
        {/* Messages */}
        {errorMsg && (
          <div className="mb-4 rounded bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">{errorMsg}</div>
        )}
        {message && (
          <div className="mb-4 rounded bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/20">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-paper/70 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded border border-paper/20 bg-transparent px-3 py-2 text-sm text-paper placeholder:text-paper/30 focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-paper/70 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border border-paper/20 bg-transparent px-3 py-2 text-sm text-paper placeholder:text-paper/30 focus:border-gold focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gold py-2.5 font-mono text-xs font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center justify-center gap-3">
          <span className="h-px w-full bg-paper/10"></span>
          <span className="font-mono text-[10px] uppercase text-paper/40">OR</span>
          <span className="h-px w-full bg-paper/10"></span>
        </div>

        {/* Social Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => handleOAuthSignIn("google")}
            className="w-full rounded-full border border-paper/20 py-2 font-mono text-xs text-paper transition hover:border-paper/40"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuthSignIn("apple")}
            className="w-full rounded-full border border-paper/20 py-2 font-mono text-xs text-paper transition hover:border-paper/40"
          >
            Continue with Apple
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-xs text-paper/60">
          {isSignUp ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-gold underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-gold underline underline-offset-2"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
