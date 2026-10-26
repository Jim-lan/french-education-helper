import { BookIcon } from "./Icons";
export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="French Education Helper home">
        <span className="brand-mark">
          <BookIcon />
        </span>
        <span>
          French Education <strong>Helper</strong>
        </span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        <a href="/">New note</a>
        <a href="/history">Learning history</a>
        <a href="/monthly">Monthly review</a>
      </nav>
    </header>
  );
}
