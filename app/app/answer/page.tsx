import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { AnswerClient } from "./AnswerClient";
export const metadata: Metadata = { title: "Get called" };
export default function Page() {
  return (
    <Shell>
      <div className="mx-auto w-full max-w-[720px] px-4 pt-10 text-center">
        <p className="label text-accent">the same call every resident gets</p>
        <h1 className="mt-2 text-[36px] font-extrabold md:text-[48px]">Get called yourself</h1>
        <p className="mx-auto mt-2 max-w-[54ch] text-[16px] text-ink-muted">Carried in your browser instead of over a phone line. Polly speaks, Lex understands, the rules decide, and your pin appears on the map.</p>
      </div>
      <Suspense fallback={null}><AnswerClient /></Suspense>
    </Shell>
  );
}
