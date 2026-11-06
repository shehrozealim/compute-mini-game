import { MAP_IDS, TROOP_IDS, type MapId, type TroopId } from "./config";
export type Seat = { id: string; name: string; team: number; role: string };
export type Lobby = {
  code: string;
  host: string;
  seats: Seat[];
  map: MapId;
  troops: TroopId[];
  active: boolean;
};
export type Phase = "connecting" | "lobby" | "playing" | "results" | "error";
export type EntryState = { phase: Phase; room: Lobby | null };
export const initialEntry: EntryState = { phase: "connecting", room: null };
export type EntryEvent =
  | { type: "ack" }
  | { type: "lobby"; room: Lobby }
  | { type: "phase"; phase: Phase };
export function isLobby(value: unknown): value is Lobby {
  if (!value || typeof value !== "object") return false;
  const r = value as Lobby;
  return (
    typeof r.code === "string" &&
    /^[A-F0-9]{6}$/.test(r.code) &&
    typeof r.host === "string" &&
    MAP_IDS.includes(r.map) &&
    typeof r.active === "boolean" &&
    Array.isArray(r.troops) &&
    r.troops.length === 2 &&
    r.troops.every((t) => TROOP_IDS.includes(t)) &&
    Array.isArray(r.seats) &&
    r.seats.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        [0, 1].includes(p.team) &&
        ["both", "move", "shoot"].includes(p.role),
    )
  );
}
// An acknowledgement has a code, not the teams/troops required to render.
export function reduceEntry(state: EntryState, event: EntryEvent): EntryState {
  if (event.type === "ack") return state;
  if (event.type === "lobby") return { room: event.room, phase: "lobby" };
  if (event.phase === "connecting") return { room: null, phase: "connecting" };
  if (event.phase === "lobby" && !state.room)
    return { ...state, phase: "connecting" };
  return { ...state, phase: event.phase };
}
