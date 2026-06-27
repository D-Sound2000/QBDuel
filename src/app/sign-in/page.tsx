import { KeyRound, Lock, LogIn, Mail, Sparkles, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { signInWithGoogle, signInWithPassword, signUpWithPassword, resetPassword } from "@/app/auth/actions";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { hasSupabaseConfig } from "@/lib/env";
import { getCurrentProfile } from "@/lib/data";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [{ message }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  if (profile) redirect("/");

  const configured = hasSupabaseConfig();

  return (
    <main className="broadsheet auth-page">
      <div className="container auth-container">
        <section className="auth-hero-card" aria-labelledby="auth-title">
          <div className="auth-hero-copy">
            <div className="eyebrow">QBDuel account</div>
            <h1 className="page-title" id="auth-title">
              Get into the room.
            </h1>
            <p className="section-copy">Sign in, finish your player card, and queue for a 7-tossup ranked duel.</p>
          </div>
          <div className="auth-proof-grid" aria-label="Account features">
            <span>
              <strong>7</strong>
              tossups
            </span>
            <span>
              <strong>ELO</strong>
              live ladder
            </span>
            <span>
              <strong>QB</strong>
              reader API
            </span>
          </div>
        </section>

        {message ? <p className="status-message auth-status">{message}</p> : null}
        {!configured ? <p className="status-message error-message auth-status">Supabase env vars are missing. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.</p> : null}

        <div className="auth-grid">
          <section className="auth-card" aria-labelledby="signin-title">
            <div className="auth-card-header">
              <span className="auth-icon" aria-hidden="true">
                <LogIn size={19} />
              </span>
              <div>
                <div className="eyebrow">Returning player</div>
                <h2 id="signin-title">Sign in</h2>
              </div>
            </div>
            <form className="auth-form" action={signInWithPassword}>
              <label>
                <span>Email</span>
                <span className="input-with-icon">
                  <Mail size={16} />
                  <input name="email" type="email" autoComplete="email" required disabled={!configured} />
                </span>
              </label>
              <label>
                <span>Password</span>
                <span className="input-with-icon">
                  <Lock size={16} />
                  <input name="password" type="password" autoComplete="current-password" minLength={6} required disabled={!configured} />
                </span>
              </label>
              <AuthSubmitButton pendingLabel="Signing in..." disabled={!configured}>
                <LogIn size={18} /> Sign in
              </AuthSubmitButton>
            </form>
            <form action={resetPassword}>
              <label className="compact-auth-field">
                <span>Password reset email</span>
                <span className="input-with-icon">
                  <KeyRound size={16} />
                  <input name="email" type="email" placeholder="email@example.com" required disabled={!configured} />
                </span>
              </label>
              <AuthSubmitButton className="ghost-button full-width" pendingLabel="Sending..." disabled={!configured}>
                Reset password
              </AuthSubmitButton>
            </form>
          </section>

          <section className="auth-card auth-card-accent" aria-labelledby="create-title">
            <div className="auth-card-header">
              <span className="auth-icon" aria-hidden="true">
                <UserPlus size={19} />
              </span>
              <div>
                <div className="eyebrow">New challenger</div>
                <h2 id="create-title">Create account</h2>
              </div>
            </div>
            <form className="auth-form" action={signUpWithPassword}>
              <label>
                <span>Email</span>
                <span className="input-with-icon">
                  <Mail size={16} />
                  <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required disabled={!configured} />
                </span>
              </label>
              <label>
                <span>Password</span>
                <span className="input-with-icon">
                  <Lock size={16} />
                  <input name="password" type="password" autoComplete="new-password" placeholder="6+ characters" minLength={6} required disabled={!configured} />
                </span>
              </label>
              <AuthSubmitButton pendingLabel="Creating..." disabled={!configured}>
                <UserPlus size={18} /> Create account
              </AuthSubmitButton>
            </form>
            <form action={signInWithGoogle}>
              <AuthSubmitButton className="ghost-button large full-width" pendingLabel="Opening Google..." disabled={!configured}>
                <Sparkles size={18} /> Continue with Google
              </AuthSubmitButton>
            </form>
            <p className="auth-fineprint">If email confirmation is enabled, Supabase will send a verification link before onboarding.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
