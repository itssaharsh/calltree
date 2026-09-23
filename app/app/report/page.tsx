import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { ReportClient } from "./ReportClient";
export const metadata: Metadata = { title: "After-action report" };
export default function Page() { return <Shell><Suspense fallback={null}><ReportClient /></Suspense></Shell>; }
