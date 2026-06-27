import { PracticeClient } from "@/components/practice-client";
import { getDailyTossup, getPracticeTossups } from "@/lib/tossup-service";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ daily?: string }> }) {
  const { daily } = await searchParams;
  const isDaily = daily === "1";
  const tossups = isDaily ? [await getDailyTossup()] : await getPracticeTossups();

  return (
    <main className="broadsheet">
      <div className="container" style={{ paddingTop: 96 }}>
        <section className="section">
          <div className="section-header">
            <div className="eyebrow">{isDaily ? "Tossup of the day" : "Unranked practice"}</div>
            <h1 className="page-title">{isDaily ? "Read today's tossup." : "Seven tossups, no rating at stake."}</h1>
            <p className="section-copy">Choose a reading speed, watch each word arrive, buzz, and check your answer.</p>
          </div>
        </section>
        <PracticeClient initialTossups={tossups} mode={isDaily ? "daily" : "practice"} />
      </div>
    </main>
  );
}
