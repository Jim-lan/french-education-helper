import { HomeworkHelper } from "@/components/HomeworkHelper";
import { BookIcon, SpeakerIcon } from "@/components/Icons";
export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#homework">
        Skip to homework
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="French Education Helper home">
          <span className="brand-mark">
            <BookIcon />
          </span>
          <span>
            French Education <strong>Helper</strong>
          </span>
        </a>
        <span className="header-tag">
          <span className="status-dot" /> Made for learning together
        </span>
      </header>
      <main id="homework">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="tiny-rule" /> GRADE 3 · FRENCH IMMERSION
            </p>
            <h1>
              A little French.
              <br />A lot more <em>confidence.</em>
            </h1>
            <p className="intro">
              Turn the teacher’s note into a clear next step.
              <br className="desktop-break" /> Read it, understand it, and hear
              the French.
            </p>
            <div className="hero-features">
              <span>
                <span aria-hidden="true">✓</span> Simple English
              </span>
              <span>
                <SpeakerIcon width={17} height={17} /> French pronunciation
              </span>
            </div>
          </div>
          <div className="word-card" aria-hidden="true">
            <span className="word-card-label">ONE WORD AT A TIME</span>
            <div className="word-card-word">
              bonjour<span>✦</span>
            </div>
            <span className="word-card-meaning">
              hello · a good place to start
            </span>
            <div className="word-card-footer">
              <span className="sound-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <span>Canadian French</span>
              <span className="word-speaker">
                <SpeakerIcon />
              </span>
            </div>
          </div>
        </section>
        <HomeworkHelper />
        <footer className="site-footer">
          <span>Small steps. Growing confidence.</span>
          <span>French Education Helper · Made for curious minds.</span>
        </footer>
      </main>
    </>
  );
}
