import Link from "next/link";
import { loadSeedTreatments } from "@/lib/data-loader";
import { DISCOVER_HUBS } from "@/lib/seo-keywords";
import { WorkbenchLoader } from "@/components/WorkbenchLoader";

export default async function HomePage() {
  // Only the crawler link graph is server-rendered; the workbench loads its data in the browser.
  const initialTreatments = await loadSeedTreatments();

  return (
    <>
      <WorkbenchLoader />

      {/* Crawler-only semantic internal link graph (zero visible pixels on main UI) */}
      <nav aria-label="관련 기획 주제 및 아카이브" className="sr-only">
        <h2>기획 주제별 아이디어 허브</h2>
        <ul>
          {DISCOVER_HUBS.map((hub) => (
            <li key={hub.slug}>
              <Link href={`/discover/${hub.slug}`}>{hub.titleKo}</Link>
            </li>
          ))}
        </ul>
        <h2>최신 큐레이션 기획안 아카이브</h2>
        <ul>
          {initialTreatments.slice(0, 20).map((t) => (
            <li key={t.id}>
              <Link href={`/treatment/${t.id}`}>{t.title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
