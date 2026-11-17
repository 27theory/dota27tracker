"use client";
import { ErrorState } from "@/components/error-state";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      message="Произошла ошибка при загрузке страницы. Повторите попытку."
      retry={reset}
    />
  );
}
