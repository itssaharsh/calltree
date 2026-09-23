import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { AnswerClient } from "./AnswerClient";
export const metadata: Metadata = { title: "Get called" };
export default function Page() {
  return (
    <Shell>
      <div className="mx-auto w-full max-w-[720px] px-4 pt-8 text-center">
        <h1 className="text-[32px] font-extrabold md:text-[40px]">Get called yourself</h1>
        <p className="mx-auto mt-2 max-w-[56ch] text-[16px] text-ink-muted">This is the same call every resident on the register gets, carried in your browser instead of over a phone line. Polly speaks, Lex understands, the rules decide, and your pin appears on the map.</p>
      </div>
      <Suspense fallback={null}><AnswerClient /></Suspense>
    </Shell>
  );
}
