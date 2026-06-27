import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

export function TossupOfDayButton() {
  return (
    <Link className="tossup-read-button" href="/practice?daily=1">
      <BookOpenCheck size={16} aria-hidden="true" />
      <span>Open daily tossup</span>
    </Link>
  );
}
