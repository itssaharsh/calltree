import Link from "next/link";
import { Shell } from "@/components/Shell";
import { StatusChip } from "@/components/StatusChip";
import { Quote } from "@/components/ops/Ticker";
import { HeroMap } from "@/components/HeroMap";

function LogRow({ t, who, text, phrase, chip, chalk }: { t: string; who: string; text: string; phrase?: string; chip?: "OK" | "NEEDS" | "URGENT" | "UNSURE" | "NO_ANSWER"; chalk?: boolean }) {
  return (
    <li className={`grid grid-cols-[58px_1fr_auto] items-start gap-x-3 border-t py-3 first:border-t-0 ${chalk ? "border-white/25" : "border-line"}`}>
      <span className={`mono pt-0.5 text-[11px] ${chalk ? "text-chalk-muted" : "text-ink-muted"}`}>{t}</span>
      <p className="text-[15px] leading-snug"><span className={`label mr-1 ${chalk ? "text-chalk-muted" : ""}`}>{who}</span><Quote text={text} phrase={phrase} className={chalk ? "text-chalk [&_mark]:text-white [&_mark]:decoration-white" : ""} /></p>
      {chip ? <StatusChip status={chip} /> : <span />}
    </li>
  );
}

export default function Home() {
  return (
    <Shell right={<Link href="/ops/" className="btn btn-primary">Open the ops room</Link>}>
      <section className="px-4 pb-14 pt-12 md:px-6 md:pt-16" aria-labelledby="hero">
        <div className="mx-auto grid max-w-[1240px] items-center gap-10 md:grid-cols-[5fr_7fr]">
          <div>
            <p className="label text-accent">Heat-alert check-in calls for a town's register</p>
            <h1 id="hero" className="mt-3 text-[46px] md:text-[68px]">Every name on the list, reached within the hour.</h1>
            <p className="mt-4 max-w-[50ch] text-[17px] text-ink-muted">When a heat warning hits, Calltree phones every isolated elderly person on the town's register, asks three questions, and sends a human only to the ones who did not pick up or said something worrying.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/ops/" className="btn btn-primary btn-lg">Open the ops room</Link>
              <Link href="/answer/" className="btn btn-answer btn-lg">Answer the call</Link>
            </div>
            <p className="mt-4 text-[13px] text-ink-muted">No sign-up. 100 synthetic residents in Maryvale, Phoenix. Live on AWS: Lex, Polly, Lambda, Step Functions, DynamoDB, Amplify.</p>
          </div>
          <HeroMap />
        </div>
      </section>

      <section className="hairline px-4 py-16 md:px-6" aria-labelledby="problem">
        <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[7fr_5fr] md:items-end">
          <div>
            <div className="numeral text-[100px] text-accent md:text-[168px]">61,672</div>
            <h2 id="problem" className="mt-2 text-[30px] md:text-[40px]">people killed by heat in Europe in one summer. Most were old. Most died alone at home.</h2>
            <p className="mt-3 max-w-[64ch] text-[16px] text-ink-muted">France has required every mayor to keep a register of vulnerable people and contact them during heat waves since 2004. American cities run the same thing with volunteers. Both take days. The people nobody reached are the ones who die. <a className="cite" href="https://www.nature.com/articles/s41591-023-02419-z" target="_blank" rel="noreferrer">Nature Medicine, 2023</a>.</p>
          </div>
          <dl className="grid grid-cols-1 gap-y-6 sm:grid-cols-3 md:grid-cols-1">
            {[
              ["16.2 million", "Americans over 65 live alone.", "https://acl.gov/news-and-events/announcements/acl-releases-2023-profile-older-americans", "ACL, 2023"],
              ["50%", "of people on French heat registers were hard to reach in the 2025 heat wave. Only a third of social centres had enough staff.", "https://www.banquedesterritoires.fr/les-ccas-pendant-la-canicule-une-mobilisation-massive-mais-sous-tension", "UNCCAS survey, 2025"],
              ["600", "outreach workers New York put on the street for wellness checks in July 2026, plus 150 new volunteers.", "https://www.nyc.gov/site/em/about/press-releases/20260701_pr_NYCEM-Mayor-Mamdani-Expands-Emergency-Heat-Measures.page", "NYC Emergency Management"],
            ].map(([n, t, href, src]) => (
              <div key={n} className="hairline pt-4 first:border-t-0 first:pt-0"><dt className="numeral text-[42px]">{n}</dt><dd className="mt-1 text-[14px] text-ink-muted">{t} <a className="cite" href={href} target="_blank" rel="noreferrer">{src}</a></dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section id="how" className="hairline px-4 py-16 md:px-6" aria-labelledby="how-h">
        <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[5fr_7fr]">
          <div>
            <h2 id="how-h" className="text-[32px] md:text-[44px]">Alert, call, decide, escalate, report.</h2>
            <ol className="mt-6 flex flex-col">
              {[
                ["A heat warning", "EventBridge Scheduler polls the National Weather Service zone every 15 minutes. A new warning starts the campaign on its own."],
                ["Every line rings", "Step Functions fans out eight calls at a time, retries anyone who did not pick up, and never skips a name."],
                ["Three questions", "How are you feeling? Is your cooling working and do you have water? Do you need anything? Polly asks. Amazon Lex understands each answer with a confidence and a sentiment."],
                ["Code decides, not a prompt", "OK needs three clear affirmatives. Anything on the never-OK list is urgent. Anything unclear goes to a person. 120 lines, unit tested, scored on 60 labelled calls."],
                ["A person acts", "A neighbour is called for urgent cases, staff call back the unclear ones, a delivery goes to anyone without cooling, a visit is queued after two no-answers."],
              ].map(([t, d], i) => (
                <li key={t} className="hairline grid grid-cols-[58px_1fr] gap-x-3 py-4 first:border-t-0"><span className="numeral text-[30px] text-accent">{i + 1}</span><div><h3 className="text-[19px]">{t}</h3><p className="mt-1 text-[14px] text-ink-muted">{d}</p></div></li>
              ))}
            </ol>
          </div>
          <div className="panel self-start bg-white p-5">
            <p className="label">one call from the last drill · register r041 · attempt 1 · 43 s</p>
            <ul className="mt-2">
              <LogRow t="14:02:11" who="calltree" text="How are you feeling right now? Any dizziness, or feeling unwell?" />
              <LogRow t="14:02:19" who="rosa" text="I'm fine, just a bit light-headed." phrase="light-headed" />
              <LogRow t="14:02:24" who="calltree" text="Is your air conditioning or a fan working, and do you have enough water to drink?" />
              <LogRow t="14:02:31" who="rosa" text="The AC is on." />
              <LogRow t="14:02:36" who="calltree" text="Is there anything you need today, like water, ice, or your medication?" />
              <LogRow t="14:02:41" who="rosa" text="No, I don't think so." />
            </ul>
            <div className="hairline mt-3 flex items-end justify-between pt-4"><span className="stamp stamp-URGENT text-[36px]">Urgent</span><span className="text-right text-[13px] text-ink-muted">never-OK phrase · neighbour called at 14:03:19</span></div>
          </div>
        </div>
      </section>

      <section className="chalk-grain blueprint relative bg-blue px-4 py-16 text-chalk md:px-6" aria-labelledby="unhappy">
        <div className="relative mx-auto grid max-w-[1240px] gap-10 md:grid-cols-2">
          <div>
            <h2 id="unhappy" className="text-[32px] md:text-[44px]">The unhappy path, on purpose.</h2>
            <ul className="mt-6">
              <LogRow chalk t="Q1" who="resident" text="I'm fine, just a bit light-headed." phrase="light-headed" chip="URGENT" />
              <LogRow chalk t="Q2" who="resident" text="What? I cannot hear you, the dog is barking." chip="UNSURE" />
              <LogRow chalk t="Q2" who="resident" text="The AC has been broken since Tuesday, it is very hot in here." phrase="broken" chip="NEEDS" />
              <LogRow chalk t="ring" who="line" text="no pick-up twice, home visit queued" chip="NO_ANSWER" />
            </ul>
            <p className="mt-4 text-[15px] text-chalk-muted">It starts with fine. It is never OK. Nothing is guessed. No skipped rows.</p>
          </div>
          <div>
            <h2 className="text-[32px] md:text-[44px]">What is real, what is not.</h2>
            <ul className="mt-6 flex flex-col text-[15px]">
              <li className="border-t border-white/25 py-3 first:border-t-0"><span className="label text-chalk-muted">real</span> Lex understanding, the rules, the escalations, the report, the NWS watch, the browser call in your own voice.</li>
              <li className="border-t border-white/25 py-3"><span className="label text-chalk-muted">synthetic</span> the 100 residents. No real person's data is on this register.</li>
              <li className="border-t border-white/25 py-3"><span className="label text-chalk-muted">not yet</span> the phone line. This AWS account is billed through AISPL, which cannot create Amazon Connect or Chime SDK numbers. The carrier is pluggable; a Twilio number attaches with three environment variables.</li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3"><Link href="/answer/" className="btn btn-chalk btn-lg">Answer the call yourself</Link><Link href="/ops/" className="btn btn-lg border border-white/40 text-chalk hover:bg-blue-2">Open the ops room</Link></div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-6" aria-labelledby="next">
        <div className="mx-auto max-w-[1240px]">
          <h2 id="next" className="text-[32px] md:text-[44px]">Where it is headed.</h2>
          <p className="mt-3 max-w-[70ch] text-[16px] text-ink-muted">Mass-notification products send one-way alerts. Nobody knows who is actually alright. Calltree is the two-way layer: the same register and the same three questions, with a different trigger. Power shutoffs, where California utilities must reach medical-baseline customers and send a technician if they cannot. Floods. Boil-water notices. Wildfire smoke. Starting with heat, because heat already has a law and a register.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/ops/" className="btn btn-primary btn-lg">Open the ops room</Link><a href="https://github.com/itssaharsh/calltree" className="btn btn-secondary btn-lg">Source on GitHub</a></div>
        </div>
      </section>
      <footer className="hairline px-4 py-6 text-[13px] text-ink-muted md:px-6"><div className="mx-auto flex max-w-[1240px] flex-wrap gap-x-6 gap-y-2"><span>Calltree · AWS Builder Center Zero to Shipped 2026 · #social-good #startup</span><span>Built with Claude Code connected to AWS through the AWS MCP server.</span></div></footer>
    </Shell>
  );
}
