"use client";

import { ErrorState } from "@/components/common/error-state";

export default function Error() {
  return (
    <ErrorState
      title="Não foi possível carregar o módulo"
      description="Verifique sua permissão ou tente novamente em instantes."
    />
  );
}
