import { redirect } from "next/navigation";
import { saveProfile } from "@/app/profile-actions";
import { quizCategories } from "@/lib/categories";
import { getCurrentProfile, getCurrentUser } from "@/lib/data";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [{ message }, user, profile] = await Promise.all([searchParams, getCurrentUser(), getCurrentProfile()]);
  if (!user) redirect("/sign-in");

  return (
    <main className="broadsheet">
      <div className="container auth-container">
        <section className="section auth-panel">
          <div className="section-header">
            <div className="eyebrow">Onboarding</div>
            <h1 className="page-title">Set your player card.</h1>
            <p className="section-copy">Your username is public. Category picks tune practice and future queue preferences.</p>
          </div>
          {message ? <p className="status-message error-message">{message}</p> : null}
          <form className="settings-form" action={saveProfile}>
            <label className="number-field wide-field">
              <span>Username</span>
              <input name="username" defaultValue={profile?.username ?? user.email?.split("@")[0] ?? ""} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required />
            </label>
            <div className="field-group">
              <span className="eyebrow">Categories</span>
              <div className="chip-grid">
                {quizCategories.map((category) => (
                  <label className="choice-chip" key={category}>
                    <input name="categories" type="checkbox" value={category} defaultChecked={profile?.categoryPreferences.includes(category) ?? ["Literature", "History", "Science"].includes(category)} />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="primary-button large" type="submit">
              Finish onboarding
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
