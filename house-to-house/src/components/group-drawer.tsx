"use client";

import { useEffect, useState } from "react";
import type { DGroup, Group, Person, ReminderConfig } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/data";
import { isEmail } from "@/lib/report-email";
import { useData, makeHelpers } from "@/lib/store";
import { Avatar, Chip, Insight, SeasonChip } from "./ui";
import { DGroupForm, EditGroupForm, EditPersonForm, GroupEventForm, Modal, ReadinessForm } from "./forms";
import { useScrollLock } from "@/lib/use-scroll-lock";

function statusChip(p: Person) {
  if (p.statuses.length === 0) return null;
  return (
    <span className="flex flex-wrap justify-end gap-1">
      {p.statuses.map((s) => (
        <Chip
          key={s}
          tone={
            s === "emerging"
              ? "bg-accent-soft text-accent-ink"
              : s === "wants" || s === "making"
                ? "bg-sprout-soft text-sprout"
                : s === "invited" || s === "discipled"
                  ? "bg-gold-soft text-gold"
                  : s === "declined"
                    ? "bg-dormant-soft text-dormant"
                    : "bg-surface-2 text-muted"
          }
          className="font-medium"
        >
          {STATUS_LABEL[s]}
        </Chip>
      ))}
    </span>
  );
}

export function GroupDrawer({
  group: groupProp,
  showDetail,
  onClose,
  onAddPerson,
}: {
  group: Group | null;
  showDetail: boolean;
  onClose: () => void;
  onAddPerson?: () => void;
}) {
  const { people, groups, dgroups, role, checkinLog, sections, groupSections, roleLabel, isLeadershipRole, leadershipRoleIds, myGroupIds, saveReminder, terms } =
    useData();
  const h = makeHelpers(people, leadershipRoleIds);
  const roleName = (r: Person["role"]) =>
    r === "staff" || r === "member" ? undefined : roleLabel(r);
  // Always render the live group from the store so edits reflect immediately;
  // fall back to the passed snapshot while closing.
  const group = groupProp ? (groups.find((g) => g.id === groupProp.id) ?? groupProp) : null;
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [editGroup, setEditGroup] = useState(false);
  const [recordEvent, setRecordEvent] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [dgroupModal, setDgroupModal] = useState<DGroup | "new" | null>(null);
  const [remEmail, setRemEmail] = useState("");
  const staff = role === "staff";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // If the open group was deleted, close the drawer.
  useEffect(() => {
    if (groupProp && !groups.some((g) => g.id === groupProp.id)) {
      setEditGroup(false);
      onClose();
    }
  }, [groupProp, groups, onClose]);

  const open = group !== null;
  useScrollLock(open);
  const ppl = group ? h.groupPeople(group.id) : [];
  const gKids = group ? h.groupKids(group.id) : [];
  const leadership = ppl.filter((p) => isLeadershipRole(p.role));
  const members = ppl.filter((p) => !isLeadershipRole(p.role));
  const emergingLeaders = ppl.filter((p) => p.statuses.includes("emerging"));

  // Who this viewer may edit. Staff: anyone. A leader: the ordinary members of
  // a group they lead - not people who can sign in, since editing a login's
  // email is how you would take over their access. Same rule as the
  // people_update_leader policy, so nothing offered here fails on save.
  const leadsThisGroup = group !== null && myGroupIds.includes(group.id);
  const canEditPerson = (p: Person) =>
    staff || (leadsThisGroup && (p.access ?? "none") === "none" && p.role !== "staff");

  const row = (p: Person) => {
    const editable = canEditPerson(p);
    return (
    <div
      key={p.id}
      onClick={editable ? () => setEditPerson(p) : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-1 py-1.5 ${
        editable ? "cursor-pointer hover:bg-surface-2" : ""
      }`}
      title={editable ? `Edit ${p.name}` : undefined}
    >
      <Avatar name={p.name} gender={p.gender} />
      <div>
        <div className="text-sm">{p.name}</div>
        {roleName(p.role) && (
          <div className="text-[11.5px] text-faint">{roleName(p.role)}</div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        {showDetail &&
          (h.inRelationship(p) ? (
            <span
              title="in a discipleship relationship"
              className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
            />
          ) : (
            statusChip(p)
          ))}
      </div>
    </div>
    );
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Group details"
        className={`fixed inset-y-0 right-0 z-50 w-[480px] max-w-full overflow-y-auto overscroll-contain border-l border-line bg-bg px-6 pb-24 pt-6 max-md:px-4 transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-[102%]"
        }`}
      >
        {group && (
          <>
            <div className="absolute right-4 top-4 flex items-center gap-1">
              {staff && (
                <button
                  onClick={() => setEditGroup(true)}
                  className="rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-accent-ink hover:bg-surface-2"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg px-2.5 py-1 text-xl text-muted hover:bg-surface-2"
              >
                ✕
              </button>
            </div>
            <SeasonChip group={group} />
            <h2 className="font-display mb-0.5 mt-1.5 text-2xl">{group.name}</h2>
            <div className="mb-2 text-[13.5px] text-muted">
              {group.meet} · {ppl.length} people
              {gKids.length > 0 ? ` · ${gKids.length} kids` : ""}
              {(() => {
                const sec = sections.find((s) => s.id === groupSections[group.id]);
                return sec ? ` · ${sec.name}` : "";
              })()}
              {group.lineage ? ` · ${group.lineage}` : ""}
            </div>

            {(group.tags.length > 0 || staff) && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {group.tags.map((t) => (
                  <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                    {t}
                  </span>
                ))}
                {staff && (
                  <button
                    onClick={() => setEditGroup(true)}
                    className="text-[11.5px] text-accent-ink hover:underline"
                  >
                    {group.tags.length ? "edit tags" : "＋ add tags"}
                  </button>
                )}
              </div>
            )}

            {showDetail && group.insights.length > 0 && (
              <section className="mt-5">
                <span className="label mb-2 block">Insights</span>
                <div className="flex flex-col gap-1.5">
                  {group.insights.map((i) => (
                    <Insight key={i} text={i} />
                  ))}
                </div>
              </section>
            )}

            {showDetail &&
              (() => {
                const log = checkinLog.filter((c) => c.groupId === group.id).slice(0, 3);
                if (log.length === 0) return null;
                const fmtMonth = (ym: string) => {
                  const [y, m] = ym.split("-").map(Number);
                  return new Date(y, m - 1, 1).toLocaleString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                };
                return (
                  <section className="mt-5">
                    <span className="label mb-2 block">Recent check-ins</span>
                    <div className="flex flex-col gap-2">
                      {log.map((c) => (
                        <div
                          key={c.month}
                          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px]"
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="font-semibold">{fmtMonth(c.month)}</span>
                            {c.pulseWords.length > 0 && (
                              <span className="text-muted">
                                {c.pulseWords.map((w) => w.toLowerCase()).join(" · ")}
                              </span>
                            )}
                          </div>
                          {c.attended > 0 && (
                            <div className="mt-0.5 text-[12px] text-muted">
                              {c.attended} there that night
                            </div>
                          )}
                          {c.rosterNote && (
                            <div className="mt-0.5 text-[12px] text-muted">🌱 {c.rosterNote}</div>
                          )}
                          {c.meetingChange && (
                            <div className="mt-0.5 text-[12px] text-muted">
                              Meeting changed to {c.meetingChange}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

            {showDetail &&
              (() => {
                const cfg: ReminderConfig = group.reminder ?? { frequency: "off", recipients: [] };
                const canEdit = staff || myGroupIds.includes(group.id);
                const save = (patch: Partial<ReminderConfig>) =>
                  void saveReminder(group.id, { ...cfg, ...patch });
                const meetDay = group.meet.split(" · ")[0];
                return (
                  <section className="mt-5">
                    <span className="label mb-2 block">Check-in reminder</span>
                    <div className="flex gap-1.5">
                      {(
                        [
                          ["off", "Off"],
                          ["weekly", "Weekly"],
                          ["monthly", "Monthly"],
                        ] as const
                      ).map(([f, label]) => (
                        <button
                          key={f}
                          disabled={!canEdit}
                          onClick={() => save({ frequency: f })}
                          className={`flex-1 rounded-xl border-[1.5px] py-1.5 text-[12.5px] font-medium disabled:opacity-60 ${
                            cfg.frequency === f
                              ? "border-accent bg-accent-soft text-accent-ink"
                              : "border-line text-muted"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {cfg.frequency !== "off" && (
                      <>
                        <p className="mt-1.5 px-1 text-[11.5px] text-faint">
                          A &quot;how was {terms.oneLower}?&quot; email lands a couple hours
                          after the meeting ({meetDay}).{" "}
                          {cfg.recipients.length === 0 &&
                            "No recipients listed - it goes to the group's leaders' emails."}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {cfg.recipients.map((r) => (
                            <button
                              key={r}
                              disabled={!canEdit}
                              onClick={() =>
                                save({ recipients: cfg.recipients.filter((x) => x !== r) })
                              }
                              title={canEdit ? `Remove ${r}` : undefined}
                              className="rounded-full border border-accent bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent-ink"
                            >
                              {r}
                              {canEdit && " ✕"}
                            </button>
                          ))}
                        </div>
                        {canEdit && (
                          <form
                            className="mt-2 flex gap-1.5"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const addr = remEmail.trim();
                              if (!isEmail(addr)) return;
                              save({ recipients: [...cfg.recipients, addr] });
                              setRemEmail("");
                            }}
                          >
                            <input
                              type="email"
                              value={remEmail}
                              onChange={(e) => setRemEmail(e.target.value)}
                              placeholder="add a recipient…"
                              className="min-w-0 flex-1 rounded-xl border-[1.5px] border-line bg-surface px-3 py-1.5 text-[12.5px] outline-none focus:border-accent"
                            />
                            <button
                              type="submit"
                              disabled={!isEmail(remEmail)}
                              className="rounded-xl border-[1.5px] border-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-ink disabled:opacity-50"
                            >
                              add
                            </button>
                          </form>
                        )}
                      </>
                    )}
                  </section>
                );
              })()}

            {showDetail && (group.readiness !== undefined || staff) && (
              <section className="mt-5">
                <span className="label mb-2 block">Planting readiness</span>
                {group.readiness !== undefined ? (
                  <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3.5">
                    <div className="font-display text-[26px] tabular-nums">
                      {group.readiness}
                      <span className="text-[15px] text-faint">/15</span>
                    </div>
                    <div className="text-[12.5px] leading-snug text-muted">
                      {group.readiness >= 12
                        ? "12+ - prepare to plant! 🌱"
                        : `${12 - group.readiness} more to the plant-ready threshold of 12.`}
                      {group.readinessData?.date && (
                        <span className="block text-faint">
                          Assessed {group.readinessData.date}
                        </span>
                      )}
                      {staff && (
                        <button
                          onClick={() => setAssessing(true)}
                          className="mt-1 block text-[12px] font-semibold text-accent-ink hover:underline"
                        >
                          reassess
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAssessing(true)}
                    className="w-full rounded-xl border border-dashed border-line px-4 py-2.5 text-left text-[13px] text-muted hover:border-accent hover:text-accent-ink"
                  >
                    Run the 15-point planting readiness assessment
                  </button>
                )}
                {emergingLeaders.length > 0 && (
                  <p className="mt-2 text-[12.5px] text-muted">
                    🌱 {emergingLeaders.length} emerging leader
                    {emergingLeaders.length > 1 ? "s" : ""} being raised up - {" "}
                    {emergingLeaders.map((p) => p.name.split(" ")[0]).join(", ")}
                  </p>
                )}
              </section>
            )}

            <section className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="label">Leadership team</span>
                {onAddPerson && (
                  <button
                    onClick={onAddPerson}
                    className="text-[12px] font-semibold text-accent-ink hover:underline"
                  >
                    ＋ add person
                  </button>
                )}
              </div>
              <div className="mb-1.5 flex gap-3 text-[11.5px] text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-men-soft ring-1 ring-men/40" /> men
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-women-soft ring-1 ring-women/40" /> women
                </span>
              </div>
              {leadership.length === 0 && (
                <p className="text-[12.5px] italic text-muted">No leadership recorded yet.</p>
              )}
              {leadership.map(row)}
            </section>

            <hr className="my-2 border-line" />

            <section className="mt-2.5">
              <span className="label mb-2 block">Members</span>
              {members.length === 0 && (
                <p className="text-[12.5px] italic text-muted">No members yet.</p>
              )}
              {members.map(row)}
            </section>

            {gKids.length > 0 && (
              <section className="mt-5">
                <span className="label mb-2 block">Kids</span>
                {gKids.map((k) => (
                  <div
                    key={k.id}
                    onClick={canEditPerson(k) ? () => setEditPerson(k) : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-1 py-1.5 ${
                      canEditPerson(k) ? "cursor-pointer hover:bg-surface-2" : ""
                    }`}
                    title={canEditPerson(k) ? `Edit ${k.name}` : undefined}
                  >
                    <Avatar name={k.name} gender={k.gender} size={22} />
                    <div className="text-sm">{k.name}</div>
                    <span className="ml-auto rounded-full bg-gold-soft px-2 py-0.5 text-[10.5px] font-semibold text-gold">
                      child
                    </span>
                  </div>
                ))}
              </section>
            )}

            {showDetail &&
              (() => {
                const list = dgroups.filter((d) => d.groupId === group.id);
                const men = list.filter((d) => d.gender === "M").length;
                const women = list.filter((d) => d.gender === "F").length;
                const personName = (id: string | null) =>
                  id ? (people.find((p) => p.id === id)?.name ?? null) : null;
                const title = (d: DGroup) => {
                  if (d.name) return d.name;
                  if (d.kind === "peer") return "Peer group";
                  const leader = personName(d.leaderId);
                  return leader ? `${leader.split(" ")[0]}'s D-group` : "D-group";
                };
                return (
                  <section className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="label">
                        Discipleship groups
                        {men >= 2 && women >= 2 && (
                          <Chip tone="bg-sprout-soft text-sprout" className="ml-2 font-medium">
                            plant-ready pattern
                          </Chip>
                        )}
                      </span>
                      <button
                        onClick={() => setDgroupModal("new")}
                        className="text-[12px] font-semibold text-accent-ink hover:underline"
                      >
                        ＋ add D-group
                      </button>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-[12.5px] italic text-muted">
                        None yet - D-groups are the 3-5 person clusters where multiplication
                        starts. 2 men&apos;s + 2 women&apos;s is the plant-ready pattern.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {list.map((d) => {
                          const memberNames = d.memberIds
                            .map((id) => personName(id))
                            .filter(Boolean)
                            .map((n) => n!.split(" ")[0]);
                          return (
                            <button
                              key={d.id}
                              onClick={() => setDgroupModal(d)}
                              title={`Edit ${title(d)}`}
                              className="flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left hover:border-accent"
                            >
                              <span
                                className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${
                                  d.gender === "M"
                                    ? "bg-men-soft ring-1 ring-men/40"
                                    : "bg-women-soft ring-1 ring-women/40"
                                }`}
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium">{title(d)}</span>
                                <span className="block text-[12px] text-muted">
                                  {memberNames.length > 0
                                    ? memberNames.join(", ")
                                    : "no members recorded yet"}
                                </span>
                              </span>
                              <span className="ml-auto shrink-0 text-[11.5px] text-faint">
                                {(d.kind === "peer" ? 0 : 1) + d.memberIds.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })()}

            {showDetail && (group.history.length > 0 || staff) && (
              <section className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="label">Story</span>
                  {staff && (
                    <button
                      onClick={() => setRecordEvent(true)}
                      className="text-[12px] font-semibold text-accent-ink hover:underline"
                    >
                      ＋ record an event
                    </button>
                  )}
                </div>
                {group.history.length === 0 ? (
                  <p className="text-[12.5px] italic text-muted">
                    No story recorded yet - start with when it was planted (Edit → origin
                    story) or record an event.
                  </p>
                ) : (
                  <div className="relative flex flex-col gap-3 pl-[18px] before:absolute before:bottom-1.5 before:left-1 before:top-1.5 before:w-0.5 before:rounded before:bg-line">
                    {group.history.map((ev) => (
                      <div key={ev.date + ev.text} className="relative text-[13.5px]">
                        <span className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                        <span className="block text-[11px] text-faint">{ev.date}</span>
                        {ev.text}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {!showDetail && (
              <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
                Roster names only - health insights and discipleship detail are visible to
                staff and this group&apos;s own leaders.
              </p>
            )}
          </>
        )}
      </aside>

      {editPerson && (
        <Modal title={`Edit ${editPerson.firstName}`} onClose={() => setEditPerson(null)}>
          <EditPersonForm person={editPerson} onDone={() => setEditPerson(null)} />
        </Modal>
      )}
      {editGroup && group && (
        <Modal title={`Edit ${group.name}`} onClose={() => setEditGroup(false)}>
          <EditGroupForm group={group} onDone={() => setEditGroup(false)} />
        </Modal>
      )}
      {recordEvent && group && (
        <Modal title={`${group.name}'s story`} onClose={() => setRecordEvent(false)}>
          <GroupEventForm group={group} onDone={() => setRecordEvent(false)} />
        </Modal>
      )}
      {assessing && group && (
        <Modal title={`Planting readiness - ${group.name}`} onClose={() => setAssessing(false)}>
          <ReadinessForm group={group} onDone={() => setAssessing(false)} />
        </Modal>
      )}
      {dgroupModal && group && (
        <Modal
          title={dgroupModal === "new" ? "New D-group" : "Edit D-group"}
          onClose={() => setDgroupModal(null)}
        >
          <DGroupForm
            group={group}
            dgroup={dgroupModal === "new" ? null : dgroupModal}
            onDone={() => setDgroupModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
