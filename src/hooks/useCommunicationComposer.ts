"use client";

import { useMemo, useState } from "react";
import type { CommunicationPriority } from "@/lib/communication-content";

export function useCommunicationComposer() {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [priority, setPriority] = useState<CommunicationPriority>("normal");

  const needsConfirmation = useMemo(
    () => priority === "important" || priority === "urgent" || selectedChannels.length > 1,
    [priority, selectedChannels.length],
  );

  function toggleChannel(channelId: string) {
    setSelectedChannels((current) =>
      current.includes(channelId)
        ? current.filter((id) => id !== channelId)
        : [...current, channelId],
    );
  }

  return {
    selectedChannels,
    priority,
    setPriority,
    toggleChannel,
    needsConfirmation,
  };
}
