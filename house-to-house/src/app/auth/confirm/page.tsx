import { LogoMark } from "@/components/ui";

// The emailed-link landing page. Deliberately does NOTHING on GET: email
// security scanners (Outlook SafeLinks, Gmail prefetch, antivirus) fetch every
// link in an email, and a GET that verified the one-time token would let a
// robot consume it before the human ever clicked — the #1 cause of
// "link expired" reports. Verification happens only when a person presses the
// button (a POST to /auth/verify). Scanners follow links; they don't click.

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = typeof params.type === "string" ? params.type : "email";
  const code = typeof params.code === "string" ? params.code : "";
  const valid = Boolean(tokenHash || code);

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-4">
      <div className="mb-8 flex items-center justify-center gap-3">
        <LogoMark size={46} className="text-accent" />
        <div>
          <div className="font-display text-2xl leading-none">House to House</div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-muted">
            Shepherding house to house
          </div>
        </div>
      </div>

      <div className="rounded-[14px] border border-line bg-surface p-6 text-center shadow-card">
        {valid ? (
          <>
            <p className="font-display mb-1.5 text-xl">Almost in</p>
            <p className="mb-5 text-[13.5px] leading-relaxed text-muted">
              One tap to finish signing in.
            </p>
            <form method="post" action="/auth/verify">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="code" value={code} />
              <button
                type="submit"
                className="w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-cta-ink"
              >
                Continue to House to House
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="font-display mb-1.5 text-xl">That link looks incomplete</p>
            <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
              Head to the sign-in page and request a fresh one.
            </p>
            <a
              href="/login"
              className="inline-block rounded-xl bg-accent px-5 py-2.5 text-[14.5px] font-semibold text-cta-ink"
            >
              Go to sign-in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
