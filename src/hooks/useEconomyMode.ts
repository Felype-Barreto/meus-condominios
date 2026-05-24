"use client";

export function useEconomyMode() {
  return process.env.NEXT_PUBLIC_ECONOMY_MODE === "true";
}
