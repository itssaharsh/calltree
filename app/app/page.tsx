import Link from "next/link";
import { Shell } from "@/components/Shell";
import { StatusChip } from "@/components/StatusChip";
import seed from "@/lib/seed.json";

const PERSONA_COLOR: Record<string, string> = { fine: "#4CC38A", needs: "#FFD24A", urgent: "#FF7A7A", unclear: "#F3E6CF", noanswer: "#6B7280" };

function PinField() {
  const rs = (seed as { residents: { lat: number; lon: number; persona: { kind: string } }[] }).residents;
  const lats = rs.map((r) => r.lat), lons = rs.map((r) => r.lon);
  const [minLat, maxLat, minLon, maxLon] = [Math.min(...lats), Math.max(...lats), Math.min(...lons), Math.max(...lons)];
  return (
    <svg viewBox="0 0 640 400" className="h-auto w-full" role="img" aria-label="One hundred pins on the register, coloured by what the resident said on the last drill">
      <rect width="640" height="400" fill="#151A2B" rx="16" />
      {[80, 160, 240, 320].map((y) => <path key={y} d={`M0 ${y} C 120 ${y - 30}, 260 ${y + 30}, 400 ${y - 10} S 600 ${y + 20}, 640 ${y}`} stroke="#F3E6CF" strokeOpacity="0.06" fill="none" />)}
      {rs.map((r, i) => <circle key={i} cx={30 + ((r.lon - minLon) / (maxLon - minLon)) * 580} cy={370 - ((r.lat - minLat) / (maxLat - minLat)) * 340} r={r.persona.kind === "urgent" ? 7 : 5.5} fill={PERSONA_COLOR[r.persona.kind]} stroke="#0E1220" strokeWidth="2" />)}
    </svg>
  );
}

const numbers = [
  { n: "61,672", t: "heat deaths in Europe in summer 2022. Most were older people, most died at home.", s: "Nature Medicine, 2023", href: "https://www.nature.com/articles/s41591-023-02419-z" },
  { n: "16.2 million", t: "Americans over 65 live alone.", s: "ACL, Profile of Older Americans 2023", href: "https://acl.gov/news-and-events/announcements/acl-releases-2023-profile-older-americans" },
  { n: "50%", t: "of people on French municipal heat registers were hard to reach during the 2025 heat wave; only a third of social centres had enough staff.", s: "UNCCAS survey, 2025", href: "https://www.banquedesterritoires.fr/les-ccas-pendant-la-canicule-une-mobilisation-massive-mais-sous-tension" },
  { n: "600", t: "outreach workers New York City put on the street for wellness checks in the July 2026 heat wave, plus 150 new volunteers.", s: "NYC Emergency Management, July 2026", href: "https://www.nyc.gov/site/em/about/press-releases/20260701_pr_NYCEM-Mayor-Mamdani-Expands-Emergency-Heat-Measures.page" },
];

export default function Home() {
  return (
    <Shell right={<Link href="/ops/" className="btn btn-primary">Open the ops room</Link>}>
      <section className="relative overflow-hidden px-4 pb-10 pt-14 md:px-6 md:pt-20" aria-labelledby="hero">
        <div className="lamp pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 md:grid-cols-[5fr_7fr]">
          <div>
            <p className="mono text-[12px] uppercase tracking-[0.08em] text-accent">Heat-alert check-in calls for a town's register</p>
            <h1 id="hero" className="mt-3 text-[40px] font-extrabold md:text-[56px]">Every name on the list, reached within the hour.</h1>
            <p className="mt-4 max-w-[52ch] text-[17px] text-ink-muted">When a heat warning hits, Calltree phones every isolated elderly person on the town's register, asks three questions, and sends a human only to the ones who did not pick up or said something worrying.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/ops/" className="btn btn-primary btn-lg">Open the ops room</Link>
              <Link href="/answer/" className="btn btn-secondary btn-lg">Get called yourself</Link>
            </div>
            <p className="mt-4 text-[13px] text-ink-muted">No sign-up. The register is 100 synthetic residents in Maryvale, Phoenix. Live on AWS: Lex, Polly, Lambda, Step Functions, DynamoDB, Amazon Location, Amplify Hosting.</p>
          </div>
          <div className="relative">
            <PinField />
            <div className="mt-3 flex flex-wrap gap-2">{(["OK", "NEEDS", "URGENT", "UNSURE", "NO_ANSWER"] as const).map((s) => <StatusChip key={s} status={s} />)}</div>
          </div>
        </div>
      </section>

      <section className="border-t border-line px-4 py-12 md:px-6" aria-labelledby="problem">
        <div className="mx-auto max-w-[1200px]">
          <h2 id="problem" className="text-[28px] font-extrabold md:text-[36px]">The city's answer today is a spreadsheet and a volunteer phone tree.</h2>
          <p className="mt-3 max-w-[70ch] text-[16px] text-ink-muted">France has required every mayor to keep a register of vulnerable people and contact them during heat waves since the law of 30 June 2004 (article L121-6-1, Code de l'action sociale et des familles). American cities run the same thing with volunteers. Both take days, and the people nobody reached are the ones who die.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {numbers.map((x) => <a key={x.n} href={x.href} target="_blank" rel="noreferrer" className="card flex flex-col gap-2 p-4 hover:border-line-strong"><span className="num text-[30px] font-semibold leading-none">{x.n}</span><span className="text-[14px] text-ink-muted">{x.t}</span><span className="mono mt-auto text-[11px] uppercase tracking-[0.08em] text-ink-muted">{x.s}</span></a>)}
          </div>
        </div>
      </section>

      <section id="how" className="border-t border-line px-4 py-12 md:px-6" aria-labelledby="how-h">
        <div className="mx-auto max-w-[1200px]">
          <h2 id="how-h" className="text-[28px] font-extrabold md:text-[36px]">Alert, call, decide, escalate, report.</h2>
          <ol className="mt-6 grid gap-3 md:grid-cols-5">
            {[
              ["A heat warning", "EventBridge Scheduler polls the National Weather Service zone every 15 minutes. A new warning starts the campaign on its own; a coordinator can also declare a drill."],
              ["Every line rings", "Step Functions fans out eight calls at a time, retries anyone who did not pick up after a wait, and never skips a name."],
              ["Three questions", "How are you feeling? Is your cooling working, and do you have water? Do you need anything? Polly asks, Amazon Lex understands each answer with a confidence and a sentiment."],
              ["Code decides, not a prompt", "OK needs three clear affirmatives. Anything on the never-OK list is urgent. Anything unclear goes to a person. The rules are unit-tested and scored on 60 labelled calls."],
              ["A person acts", "A neighbour is called for urgent cases, staff call back the unclear ones, a delivery goes to anyone without cooling, a visit is queued for two no-answers. Every escalation is a queue item until someone marks it resolved."],
            ].map(([t, d], i) => <li key={t} className="card p-4"><span className="mono text-[11px] uppercase tracking-[0.08em] text-accent">Step {i + 1}</span><h3 className="mt-1 text-[18px] font-extrabold">{t}</h3><p className="mt-1 text-[14px] text-ink-muted">{d}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="border-t border-line px-4 py-12 md:px-6" aria-labelledby="unhappy">
        <div className="mx-auto grid max-w-[1200px] gap-6 md:grid-cols-2">
          <div>
            <h2 id="unhappy" className="text-[28px] font-extrabold md:text-[36px]">The unhappy path, on purpose.</h2>
            <ul className="mt-4 flex flex-col gap-3 text-[15px]">
              <li className="card p-4"><StatusChip status="URGENT" /> <span className="ml-2">“I'm fine, just a bit light-headed.” It starts with fine. It is never OK. A neighbour is called within a minute.</span></li>
              <li className="card p-4"><StatusChip status="UNSURE" /> <span className="ml-2">A barking dog, a wrong language, a “who is this?”. The system does not guess. A person calls back.</span></li>
              <li className="card p-4"><StatusChip status="NO_ANSWER" /> <span className="ml-2">No pick-up twice is not a skipped row. It is a home visit in the queue.</span></li>
            </ul>
          </div>
          <div>
            <h2 className="text-[28px] font-extrabold md:text-[36px]">What is real, what is not.</h2>
            <ul className="mt-4 flex flex-col gap-2 text-[15px] text-ink-muted">
              <li><span className="text-ink">Real:</span> Lex understanding, the rules, the escalations, the report, the NWS watch, the browser call in your own voice.</li>
              <li><span className="text-ink">Synthetic:</span> the 100 residents. No real person's data is on this register.</li>
              <li><span className="text-ink">Not yet:</span> the phone line. This AWS account is billed through AISPL, which cannot create Amazon Connect or Chime SDK phone numbers. The carrier is pluggable; a Twilio number attaches with three environment variables and runs the same pipeline.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-line px-4 py-12 md:px-6" aria-labelledby="next">
        <div className="mx-auto max-w-[1200px]">
          <h2 id="next" className="text-[28px] font-extrabold md:text-[36px]">Where it is headed.</h2>
          <p className="mt-3 max-w-[70ch] text-[16px] text-ink-muted">Mass-notification products send one-way alerts. Nobody knows who is actually alright. Calltree is the two-way layer: the same register and the same three questions, with a different trigger. Power shutoffs, where California utilities must reach medical-baseline customers and send a technician if they cannot. Floods. Boil-water notices. Wildfire smoke. Starting with heat, because heat is the one that already has a law and a register.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/ops/" className="btn btn-primary btn-lg">Open the ops room</Link><a href="https://github.com/saharsh7002/calltree" className="btn btn-secondary btn-lg">Source on GitHub</a></div>
        </div>
      </section>
      <footer className="border-t border-line px-4 py-6 text-[13px] text-ink-muted md:px-6"><div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-6 gap-y-2"><span>Calltree · AWS Builder Center Zero to Shipped 2026 · #social-good #startup</span><span>Built with Claude Code connected to AWS through the AWS MCP server.</span></div></footer>
    </Shell>
  );
}
