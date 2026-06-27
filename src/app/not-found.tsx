import Link from "next/link";

export default function NotFound() {
  return (
    <main className="broadsheet">
      <div className="container auth-container">
        <section className="section">
          <div className="empty-state empty-state-large">
            <strong>No result found.</strong>
            <span>The profile or match you opened does not exist yet, or it is not visible to your account.</span>
            <Link className="primary-button" href="/">
              Back to dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
