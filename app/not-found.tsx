import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-shell error-state">
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или найдите игрока на главной.</p>
      <Link href="/" className="button button-gold">
        На главную
      </Link>
    </div>
  );
}
