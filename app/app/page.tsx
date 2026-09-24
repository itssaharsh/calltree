import Link from "next/link";
import { Shell } from "@/components/Shell";
import { StatusChip } from "@/components/StatusChip";
import { Quote } from "@/components/ops/Ticker";
import seed from "@/lib/seed.json";

const PERSONA_COLOR: Record<string, string> = { fine: "#4CC38A", needs: "#FFD24A", urgent: "#FF7A7A", unclear: "#F3E6CF", noanswer: "#6B7280" };

function PinField() {
  const rs = (seed as { residents: { lat: number; lon: number; persona: { kind: string } }[] }).residents;
  const lats = rs.map((r) => r.lat), lons = rs.map((r) => r.lon);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  const order = rs.map((r, i) => ({ i, x: 30 + ((r.lon - minLon) / (maxLon - minLon)) * 580, y: 372 - ((r.lat - minLat) / (maxLat - minLat)) * 340 })).sort((a, b) => a.x - b.x);
  return (
    <div className="relative">
      <svg viewBox="0 0 640 420" className="h-auto w-full" role="img" aria-label="One hundred pins on the register turning green, amber and red in call order">
        <rect width="640" height="420" fill="#151A2B" rx="16" />
        {[70, 150, 230, 310, 390].map((y) => <path key={y} d={`M0 ${y} C 120 ${y - 30}, 260 ${y + 30}, 400 ${y - 10} S 600 ${y + 20}, 640 ${y}`} stroke="#F3E6CF" strokeOpacity="0.07" fill="none" />)}
        {order.map(({ i, x, y }, k) => (
          <circle key={i} cx={x} cy={y} r={5.5} fill="#3E4766" stroke="#0E1220" strokeWidth="2" style={{ ["--pin" as string]: PERSONA_COLOR[rs[i].persona.kind], animation: `pinfill 14s linear ${0.8 + k * 0.1}s infinite` }} />
        ))}
      </svg>
      <div className="panel absolute left-3 top-3 px-3 py-2">
        <span className="label text-accent">heat drill running</span>
        <div className="numeral mt-0.5 text-[30px]">100<span className="text-ink-muted"> / 100</span></div>
      </div>
      <ul className="absolute bottom-3 left-3 flex gap-2">{(["OK", "NEEDS", "URGENT", "UNSURE", "NO_ANSWER"] as const).map((s) => <li key={s}><StatusChip status={s} /></li>)}</ul>
    </div>
  );
}

function LogRow({ t, who, text, phrase, chip }: { t: string; who: string; text: string; phrase?: string; chip?: "OK" | "NEEDS" | "URGENT" | "UNSURE" | "NO_ANSWER" }) {
  return (
    <li className="hairline grid grid-cols-[58px_1fr_auto] items-start gap-x-3 py-3 first:border-t-0">
      <span className="mono pt-0.5 text-[11px] text-ink-muted">{t}</span>
      <p className="text-[15px] leading-snug"><span className="label mr-1">{who}</span><Quote text={text} phrase={phrase} /></p>
      {chip ? <StatusChip status={chip} /> : <span />}
    </li>
  );
}

export default function Home() {
  return (
    <Shell right={<Link href="/ops/" className="btn btn-primary">Open the ops room</Link>}>
      <section className="relative overflow-hidden px-4 pb-12 pt-12 md:px-6 md:pt-20" aria-labelledby="hero">
        <div className="lamp pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 md:grid-cols-[5fr_7fr]">
          <div>
            <p className="label text-accent">Heat-alert check-in calls for a town's register</p>
            <h1 id="hero" className="mt-3 text-[44px] font-extrabold md:text-[64px]">Every name on the list, reached within the hour.</h1>
            <p className="mt-4 max-w-[50ch] text-[17px] text-ink-muted">When a heat warning hits, Calltree phones every isolated elderly person on the town's register, asks three questions, and sends a human only to the ones who did not pick up or said something worrying.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/ops/" className="btn btn-primary btn-lg">Open the ops room</Link>
              <Link href="/answer/" className="btn btn-secondary btn-lg">Get called yourself</Link>
            </div>
            <p className="mt-4 text-[13px] text-ink-muted">No sign-up. 100 synthetic residents in Maryvale, Phoenix. Live on AWS: Lex, Polly, Lambda, Step Functions, DynamoDB, Amplify.</p>
          </div>
          <PinField />
        </div>
      </section>

      <section className="hairline px-4 py-14 md:px-6" aria-labelledby="problem">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[7fr_5fr] md:items-end">
          <div>
            <div className="numeral text-[96px] text-ink md:text-[150px]">61,672</div>
            <h2 id="problem" className="mt-2 text-[28px] font-extrabold md:text-[36px]">people killed by heat in Europe in one summer. Most were old. Most died alone at home.</h2>
            <p className="mt-3 max-w-[64ch] text-[16px] text-ink-muted">France has required every mayor to keep a register of vulnerable people and contact them during heat waves since 2004. American cities run the same thing with volunteers. Both take days. The people nobody reached are the ones who die. <a className="underline decoration-line underline-offset-4 hover:decoration-accent" href="https://www.nature.com/articles/s41591-023-02419-z" target="_blank" rel="noreferrer">Nature Medicine, 2023</a>.</p>
          </div>
          <dl className="grid grid-cols-1 gap-y-6 sm:grid-cols-3 md:grid-cols-1">
            {[
              ["16.2 million", "Americans over 65 live alone.", "https://acl.gov/news-and-events/announcements/acl-releases-2023-profile-older-americans", "ACL, 2023"],
              ["50%", "of people on French heat registers were hard to reach in the 2025 heat wave. Only a third of social centres had enough staff.", "https://www.banquedesterritoires.fr/les-ccas-pendant-la-canicule-une-mobilisation-massive-mais-sous-tension", "UNCCAS survey, 2025"],
              ["600", "outreach workers New York put on the street for wellness checks in July 2026, plus 150 new volunteers.", "https://www.nyc.gov/site/em/about/press-releases/20260701_pr_NYCEM-Mayor-Mamdani-Expands-Emergency-Heat-Measures.page", "NYC Emergency Management"],
            ].map(([n, t, href, src]) => (
              <div key={n} className="hairline pt-4 first:border-t-0 first:pt-0"><dt className="numeral text-[40px]">{n}</dt><dd className="mt-1 text-[14px] text-ink-muted">{t} <a className="label hover:text-ink" href={href} target="_blank" rel="noreferrer">{src}</a></dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="how" className="hairline px-4 py-14 md:px-6" aria-labelledby="how-h">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[5fr_7fr]">
          <div>
            <h2 id="how-h" className="text-[32px] font-extrabold md:text-[40px]">Alert, call, decide, escalate, report.</h2>
            <ol className="mt-6 flex flex-col">
              {[
                ["A heat warning", "EventBridge Scheduler polls the National Weather Service zone every 15 minutes. A new warning starts the campaign on its own."],
                ["Every line rings", "Step Functions fans out eight calls at a time, retries anyone who did not pick up, and never skips a name."],
                ["Three questions", "How are you feeling? Is your cooling working and do you have water? Do you need anything? Polly asks. Amazon Lex understands each answer with a confidence and a sentiment."],
                ["Code decides, not a prompt", "OK needs three clear affirmatives. Anything on the never-OK list is urgent. Anything unclear goes to a person. 120 lines, unit tested, scored on 60 labelled calls."],
                ["A person acts", "A neighbour is called for urgent cases, staff call back the unclear ones, a delivery goes to anyone without cooling, a visit is queued after two no-answers."],
              ].map(([t, d], i) => (
                <li key={t} className="hairline grid grid-cols-[58px_1fr] gap-x-3 py-4 first:border-t-0"><span className="numeral text-[28px] text-accent">{i + 1}</span><div><h3 className="text-[18px] font-extrabold">{t}</h3><p className="mt-1 text-[14px] text-ink-muted">{d}</p></div></li>
              ))}
            </ol>
          </div>
          <div className="panel self-start p-5">
            <p className="label">one call from the last drill · register r041 · attempt 1 · 43 s</p>
            <ul className="mt-2">
              <LogRow t="14:02:11" who="calltree" text="How are you feeling right now? Any dizziness, or feeling unwell?" />
              <LogRow t="14:02:19" who="rosa" text="I'm fine, just a bit light-headed." phrase="light-headed" />
              <LogRow t="14:02:24" who="calltree" text="Is your air conditioning or a fan working, and do you have enough water to drink?" />
              <LogRow t="14:02:31" who="rosa" text="The AC is on." />
              <LogRow t="14:02:36" who="calltree" text="Is there anything you need today, like water, ice, or your medication?" />
              <LogRow t="14:02:41" who="rosa" text="No, I don't think so." />
            </ul>
            <div className="hairline mt-3 flex items-end justify-between pt-4"><span className="stamp stamp-URGENT text-[34px]">Urgent</span><span className="text-right text-[13px] text-ink-muted">never-OK phrase · neighbour called at 14:03:19</span></div>
          </div>
        </div>
      </section>

      <section className="hairline px-4 py-14 md:px-6" aria-labelledby="unhappy">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-2">
          <div>
            <h2 id="unhappy" className="text-[32px] font-extrabold md:text-[40px]">The unhappy path, on purpose.</h2>
            <ul className="mt-6">
              <LogRow t="Q1" who="resident" text="I'm fine, just a bit light-headed." phrase="light-headed" chip="URGENT" />
              <LogRow t="Q2" who="resident" text="What? I cannot hear you, the dog is barking." chip="UNSURE" />
              <LogRow t="Q2" who="resident" text="The AC has been broken since Tuesday, it is very hot in here." phrase="broken" chip="NEEDS" />
              <LogRow t="ring" who="line" text="no pick-up twice, home visit queued" chip="NO_ANSWER" />
            </ul>
            <p className="mt-4 text-[14px] text-ink-muted">It starts with fine. It is never OK. Nothing is guessed. No skipped rows.</p>
          </div>
          <div>
            <h2 className="text-[32px] font-extrabold md:text-[40px]">What is real, what is not.</h2>
            <ul className="mt-6 flex flex-col text-[15px]">
              <li className="hairline py-3 first:border-t-0"><span className="label">real</span> Lex understanding, the rules, the escalations, the report, the NWS watch, the browser call in your own voice.</li>
              <li className="hairline py-3"><span className="label">synthetic</span> the 100 residents. No real person's data is on this register.</li>
              <li className="hairline py-3"><span className="label">not yet</span> the phone line. This AWS account is billed through AISPL, which cannot create Amazon Connect or Chime SDK numbers. The carrier is pluggable; a Twilio number attaches with three environment variables.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="hairline px-4 py-14 md:px-6" aria-labelledby="next">
        <div className="mx-auto max-w-[1200px]">
          <h2 id="next" className="text-[32px] font-extrabold md:text-[40px]">Where it is headed.</h2>
          <p className="mt-3 max-w-[70ch] text-[16px] text-ink-muted">Mass-notification products send one-way alerts. Nobody knows who is actually alright. Calltree is the two-way layer: the same register and the same three questions, with a different trigger. Power shutoffs, where California utilities must reach medical-baseline customers and send a technician if they cannot. Floods. Boil-water notices. Wildfire smoke. Starting with heat, because heat already has a law and a register.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/ops/" className="btn btn-primary btn-lg">Open the ops room</Link><a href="https://github.com/itssaharsh/calltree" className="btn btn-secondary btn-lg">Source on GitHub</a></div>
        </div>
      </section>
      <footer className="hairline px-4 py-6 text-[13px] text-ink-muted md:px-6"><div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-6 gap-y-2"><span>Calltree · AWS Builder Center Zero to Shipped 2026 · #social-good #startup</span><span>Built with Claude Code connected to AWS through the AWS MCP server.</span></div></footer>
    </Shell>
  );
}
