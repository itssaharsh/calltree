import type { Metadata } from "next";
import { OpsRoom } from "@/components/ops/OpsRoom";
export const metadata: Metadata = { title: "Ops room" };
export default function Page() { return <OpsRoom />; }
