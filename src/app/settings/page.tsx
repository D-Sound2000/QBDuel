import { redirect } from "next/navigation";
import { updateSettings } from "@/app/profile-actions";
import { signOut } from "@/app/auth/actions";
import { quizCategories } from "@/lib/categories";
import { getCurrentProfile } from "@/lib/data";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const [{ message }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  if (!profile) redirect("/sign-in");

  return (
    <main className="broadsheet">
      <div className="container" style={{ paddingTop: 96 }}>
        <section className="section">
          <div className="section-header">
            <div className="eyebrow">Account</div>
            <h1 className="page-title">Settings</h1>
            <p className="section-copy">Update your public profile and practice preferences.</p>
          </div>
          {message ? <p className="status-message">{message}</p> : null}
          <form className="settings-form" action={updateSettings}>
            <label className="number-field wide-field">
              <span>Username</span>
              <input name="username" defaultValue={profile.username} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required />
            </label>
            <div className="field-group">
              <span className="eyebrow">Preferred categories</span>
              <div className="chip-grid">
                {quizCategories.map((category) => (
                  <label className="choice-chip" key={category}>
                    <input name="categories" type="checkbox" value={category} defaultChecked={profile.categoryPreferences.includes(category)} />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="primary-button large" type="submit">
              Save settings
            </button>
          </form>
          <form className="settings-signout" action={signOut}>
            <button className="ghost-button" type="submit">
              Sign out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
