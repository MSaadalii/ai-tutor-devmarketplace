import Link from "next/link";
import type { ReactNode } from "react";

export function AuthPageFrame({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="auth-page min-h-screen">
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="Visual AI Tutor home">
          <span className="auth-brand-mark" aria-hidden="true">v</span>
          <span>Visual AI Tutor</span>
        </Link>
        <Link href="/" className="auth-home-link">Back to home <span aria-hidden="true">↗</span></Link>
      </header>

      <main className="auth-main">
        <section className="auth-welcome" aria-label="A warmer way to learn">
          <span className="auth-kicker">LEARN WITH CLARITY</span>
          <h2>A little help can make a big difference.</h2>
          <p>Pick up where you left off, with thoughtful explanations and a board that makes each step easier to see.</p>
          <div className="auth-note" aria-hidden="true">
            <span className="auth-note-label"><span className="auth-live-dot" /> YOUR LEARNING SPACE</span>
            <div className="auth-note-equation">(x + 3)<sup>2</sup> = x<sup>2</sup> + 6x + 9</div>
            <div className="auth-note-caption"><span>✦</span> See how each part fits together</div>
          </div>
          <div className="auth-trust"><span>✳ Clear, visual lessons</span><span>✳ Made for curious minds</span></div>
        </section>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-top">
            <span className="auth-eyebrow">{eyebrow}</span>
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          {footer ? <div className="auth-footer">{footer}</div> : null}
          <p className="auth-security"><span aria-hidden="true">⌑</span> Your account is protected with secure sign-in.</p>
        </section>
      </main>
      <footer className="auth-bottom"><span>Visual AI Tutor</span><span>Learn at your own pace.</span></footer>
    </div>
  );
}
