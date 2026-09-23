"use client";
import { useSearchParams } from "next/navigation";
import { CallCard } from "@/components/CallCard";
export function AnswerClient() { const p = useSearchParams(); return <CallCard presetName={p.get("as") || undefined} />; }
