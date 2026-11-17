"use client";
import Link from "next/link";
import { RefreshCw, SearchX } from "lucide-react";
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="page-shell error-state">
      <SearchX size={42} className="mx-auto muted" />
      <h1>Не удалось загрузить данные</h1>
      <p>{message}</p>
      <div className="flex justify-center gap-3">
        <button className="button button-gold" onClick={retry}>
          <RefreshCw size={15} /> Повторить
        </button>
        <Link href="/" className="button button-ghost">
          На главную
        </Link>
      </div>
    </div>
  );
}
