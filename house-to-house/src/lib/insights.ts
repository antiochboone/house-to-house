// The "insights, not verdicts" engine: turns raw membership / discipleship /
// check-in history into short observations phrased the way a shepherd would
// say them. Computed fresh on every load — never stored.

interface PersonLite {
  isChild: boolean;
  gender: string | null;
}

interface MembershipRow {
  group_id: string;
  person_id: string;
  joined_at: string;
  left_at: string | null;
}

interface RelationshipRow {
  discipler_id: string;
  disciple_id: string;
}

interface CheckinRow {
  group_id: string;
  month: string;
  pulse_words: string[] | null;
}

export interface InsightContext {
  people: Map<string, PersonLite>;
  allMemberships: MembershipRow[];
  relationships: RelationshipRow[];
  checkins: CheckinRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

const monthName = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
};

export function computeInsights(
  groupId: string,
  season: string | null,
  ctx: InsightContext,
): string[] {
  const lines: string[] = [];
  const gMems = ctx.allMemberships.filter((m) => m.group_id === groupId);
  const active = gMems.filter((m) => !m.left_at);
  const adults = active.filter((m) => !ctx.people.get(m.person_id)?.isChild);

  // --- Check-in recency + pulse ---
  const gCheckins = ctx.checkins
    .filter((c) => c.group_id === groupId)
    .sort((a, b) => b.month.localeCompare(a.month));
  const latest = gCheckins[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (latest && latest.month.startsWith(thisMonth)) {
    const words = (latest.pulse_words ?? []).map((w) => w.toLowerCase());
    lines.push(
      words.length
        ? `Feeling ${words.join(", ")} (${monthName(thisMonth)} check-in)`
        : `Checked in for ${monthName(thisMonth)}`,
    );
  } else if (latest) {
    lines.push(`Last check-in: ${monthName(latest.month.slice(0, 7))}`);
  } else {
    lines.push("No check-ins yet");
  }

  // --- Roster trend (last 3 months) ---
  const d90 = isoDaysAgo(90);
  const joins = gMems.filter((m) => m.joined_at >= d90).length;
  const leaves = gMems.filter((m) => m.left_at && m.left_at >= d90).length;
  const net = joins - leaves;
  if (net > 0) {
    lines.push(`Grown by ${net} in the last 3 months`);
  } else if (net < 0) {
    lines.push(`Down ${-net} in the last 3 months`);
  } else if (joins === 0 && leaves === 0 && active.length > 0) {
    const newestJoin = active.reduce(
      (max, m) => (m.joined_at > max ? m.joined_at : max),
      "0000",
    );
    if (newestJoin < isoDaysAgo(180)) {
      const months = Math.floor(
        (Date.now() - new Date(newestJoin).getTime()) / (30 * DAY_MS),
      );
      lines.push(
        `Roster unchanged in ~${months} months${
          season !== "stagnant" ? " — drifting toward Stagnant?" : ""
        }`,
      );
    }
  }

  // --- Discipleship density ---
  if (adults.length >= 4) {
    const ids = new Set(adults.map((m) => m.person_id));
    const inRel = new Set<string>();
    for (const r of ctx.relationships) {
      if (ids.has(r.disciple_id)) inRel.add(r.disciple_id);
      if (ids.has(r.discipler_id)) inRel.add(r.discipler_id);
    }
    lines.push(`${inRel.size} of ${adults.length} adults in a discipleship relationship`);

    // Plant-ready pattern: 2+ men's and 2+ women's discipleship clusters
    const disciplersByGender = { M: new Set<string>(), F: new Set<string>() };
    for (const r of ctx.relationships) {
      if (!ids.has(r.disciple_id)) continue;
      const g = ctx.people.get(r.discipler_id)?.gender;
      if (g === "M" || g === "F") disciplersByGender[g].add(r.discipler_id);
    }
    if (disciplersByGender.M.size >= 2 && disciplersByGender.F.size >= 2) {
      lines.push("2+ men's and 2+ women's discipleship clusters — the plant-ready pattern");
    }
  }

  return lines.slice(0, 4);
}
