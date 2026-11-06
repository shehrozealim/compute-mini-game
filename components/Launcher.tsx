"use client";
import dynamic from "next/dynamic";
const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => <p>Preparing the arena…</p>,
});
export default function Launcher() {
  return <Game />;
}
