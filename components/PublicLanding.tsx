"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Public landing page (logged-out home).
 *
 * French by default — Montréal is the founding launch city — with a
 * working FR/EN toggle persisted in localStorage. Real photos only
 * (see public/landing/README.md): for Running, feet/shoes close-up
 * only, never a full-body runner shot. No fake data anywhere: no
 * invented users, sessions, testimonials or numbers.
 *
 * The logged-in home lives in app/page.tsx and is untouched by this
 * component; only the logged-out branch renders it.
 */

type Lang = "fr" | "en";

type Step = { title: string; text: string };

type Copy = {
  langLabel: string;
  login: string;
  signup: string;
  launchPill: string;
  heroTitleA: string;
  heroTitleB: string;
  heroTitleC: string;
  heroSub: string;
  ctaSignup: string;
  ctaHow: string;
  ctaNote: string;
  heroPhotoAlt: string;
  howTitle: string;
  howSub: string;
  steps: Step[];
  sportsTitle: string;
  sportsSub: string;
  sports: string[];
  sportsMore: string;
  sportsMoreSub: string;
  orgTitle: string;
  orgSub: string;
  orgBullets: string[];
  orgCta: string;
  orgNote: string;
  footerTagline: string;
  footerAbout: string;
  footerLinks: string;
  footerTerms: string;
  footerPrivacy: string;
  footerContact: string;
  footerAccount: string;
  footerRights: string;
};

const FR: Copy = {
  langLabel: "Français",
  login: "Se connecter",
  signup: "S'inscrire",
  launchPill: "Lancement à Montréal",
  heroTitleA: "Ton sport.",
  heroTitleB: "Ton moment.",
  heroTitleC: "Ton groupe.",
  heroSub:
    "Dis ce que tu as envie de jouer. Plaiyo rassemble les bonnes personnes, près de toi. On commence par Montréal.",
  ctaSignup: "Créer un compte gratuit",
  ctaHow: "Comment ça marche",
  ctaNote: "Gratuit pour les joueurs. Aucune carte bancaire.",
  heroPhotoAlt: "Joueuses de padel en pleine partie, à l'intérieur",
  howTitle: "Comment ça marche",
  howSub: "Trois étapes, et tu joues.",
  steps: [
    {
      title: "Dis ce que tu as envie de jouer",
      text: "Choisis ton sport, ton niveau et ton quartier.",
    },
    {
      title: "Trouve ta session",
      text: "Parcours les sessions près de chez toi et rejoins celle qui te convient.",
    },
    {
      title: "Joue, et reviens",
      text: "Retrouve les mêmes personnes semaine après semaine. C'est ça, ton groupe.",
    },
  ],
  sportsTitle: "Trouve ton sport",
  sportsSub: "77 sports, du padel au yoga. En voici quelques-uns pour commencer.",
  sports: ["Padel", "Escalade", "Badminton", "Yoga", "Course à pied"],
  sportsMore: "Et 72 autres sports",
  sportsMoreSub: "77 sports au total, en 11 catégories.",
  orgTitle: "Vous organisez des sessions ?",
  orgSub:
    "Clubs, salles, studios : créez vos sessions sur Plaiyo et partagez le lien avec vos membres.",
  orgBullets: [
    "Créez une session en quelques minutes",
    "Partagez le lien dans vos groupes et sur vos réseaux",
    "Retrouvez vos membres chaque semaine",
  ],
  orgCta: "Créer un compte gratuit",
  orgNote: "Gratuit pour les organisateurs pendant le pilote.",
  footerTagline: "Ton sport. Ton moment. Ton groupe.",
  footerAbout:
    "Plaiyo aide les sportifs à trouver des partenaires près de chez eux et à rejoindre ou créer des sessions locales.",
  footerLinks: "Liens",
  footerTerms: "Conditions d'utilisation",
  footerPrivacy: "Politique de confidentialité",
  footerContact: "Contact",
  footerAccount: "Compte",
  footerRights: "© 2026 Plaiyo",
};

const EN: Copy = {
  langLabel: "English",
  login: "Log in",
  signup: "Sign up",
  launchPill: "Launching in Montréal",
  heroTitleA: "Your sport.",
  heroTitleB: "Your moment.",
  heroTitleC: "Your crew.",
  heroSub:
    "Say what you're up for. Plaiyo brings the right people together, near you. We're starting in Montréal.",
  ctaSignup: "Create a free account",
  ctaHow: "How it works",
  ctaNote: "Free for players. No credit card.",
  heroPhotoAlt: "Padel players mid-game, indoors",
  howTitle: "How it works",
  howSub: "Three steps, and you play.",
  steps: [
    {
      title: "Say what you're up for",
      text: "Pick your sport, your level and your neighbourhood.",
    },
    {
      title: "Find your session",
      text: "Browse sessions near you and join the one that fits.",
    },
    {
      title: "Play, and come back",
      text: "See the same faces week after week. That's your crew.",
    },
  ],
  sportsTitle: "Find your sport",
  sportsSub: "77 sports, from padel to yoga. Here are a few to start with.",
  sports: ["Padel", "Climbing", "Badminton", "Yoga", "Running"],
  sportsMore: "And 72 more sports",
  sportsMoreSub: "77 sports in total, across 11 categories.",
  orgTitle: "Do you host sessions?",
  orgSub:
    "Clubs, gyms and studios: create your sessions on Plaiyo and share the link with your members.",
  orgBullets: [
    "Create a session in a few minutes",
    "Share the link in your groups and on social media",
    "See your members week after week",
  ],
  orgCta: "Create a free account",
  orgNote: "Free for organizers during the pilot.",
  footerTagline: "Your sport. Your moment. Your crew.",
  footerAbout:
    "Plaiyo helps people find sports partners nearby and join or host local sessions.",
  footerLinks: "Links",
  footerTerms: "Terms of Service",
  footerPrivacy: "Privacy Policy",
  footerContact: "Contact",
  footerAccount: "Account",
  footerRights: "© 2026 Plaiyo",
};

const SPORT_PHOTOS = [
  { src: "/landing/padel.jpg", key: 0 },
  { src: "/landing/escalade.jpg", key: 1 },
  { src: "/landing/badminton.jpg", key: 2 },
  { src: "/landing/yoga.jpg", key: 3 },
  { src: "/landing/running.jpg", key: 4 },
] as const;

const LANG_KEY = "plaiyo_lang";

export default function PublicLanding() {
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    // Read the stored preference only after mount: localStorage does not
    // exist during SSR, and reading it in the initializer would hydrate
    // a different language than the server rendered. French default
    // stands until this runs.
    try {
      const stored = window.localStorage.getItem(LANG_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- applying a persisted preference once on mount; there is no event to subscribe to.
      if (stored === "en" || stored === "fr") setLang(stored);
    } catch {
      // Private mode etc: French default stands.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Ignore storage failures; the page still works.
    }
    document.documentElement.lang = lang === "fr" ? "fr" : "en";
  }, [lang]);

  const t = lang === "fr" ? FR : EN;

  return (
    // Break out of the layout's max-w-md app column to span the full
    // viewport, like the previous landing did (-mt-6/-mb-24 cancel the
    // layout's vertical padding).
    <div className="relative left-1/2 -mb-24 -mt-6 w-screen -translate-x-1/2">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-navy/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" aria-label="Plaiyo" className="shrink-0">
            <Image
              src="/logo-desktop.png"
              alt="Plaiyo"
              width={1672}
              height={455}
              priority
              className="h-7 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              role="group"
              aria-label={t.langLabel}
              className="flex rounded-full border border-white/25 p-1"
            >
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider transition-colors ${
                    lang === l
                      ? "bg-lime text-ink"
                      : "text-warm-white/70 hover:text-warm-white"
                  }`}
                >
                  {l === "fr" ? "FR" : "EN"}
                </button>
              ))}
            </div>
            <Link
              href="/login"
              className="hidden text-sm font-black uppercase tracking-wider text-warm-white sm:block"
            >
              {t.login}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-primary px-4 py-2 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30"
            >
              {t.signup}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-navy pb-16 pt-10 lg:pb-0 lg:pt-0">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="overflow-hidden rounded-[2rem] bg-midnight lg:grid lg:grid-cols-2 lg:rounded-none lg:bg-transparent">
            <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-0 lg:py-24 lg:pr-16">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-lime">
                <span className="h-2 w-2 rounded-full bg-lime" />
                {t.launchPill}
              </p>
              <h1 className="mt-6 text-5xl font-black leading-[1.05] text-warm-white sm:text-6xl">
                <span className="block">{t.heroTitleA}</span>
                <span className="block">{t.heroTitleB}</span>
                <span className="block">{t.heroTitleC}</span>
              </h1>
              <p className="mt-5 max-w-md text-lg font-semibold leading-relaxed text-warm-white/80">
                {t.heroSub}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/signup"
                  className="rounded-full bg-primary px-7 py-4 text-center font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30"
                >
                  {t.ctaSignup}
                </Link>
                <a
                  href="#comment-ca-marche"
                  className="rounded-full border border-white/30 px-7 py-4 text-center font-black uppercase tracking-wider text-warm-white"
                >
                  {t.ctaHow}
                </a>
              </div>
              <p className="mt-5 text-sm font-semibold text-warm-white/60">
                {t.ctaNote}
              </p>
            </div>
            <div className="relative min-h-[300px] sm:min-h-[380px] lg:min-h-[560px]">
              <Image
                src="/landing/hero-padel.jpg"
                alt={t.heroPhotoAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="bg-soft py-16 lg:py-20">
        <div className="mx-auto w-full max-w-6xl px-5">
          <h2 className="text-3xl font-black text-ink sm:text-4xl">
            {t.howTitle}
          </h2>
          <p className="mt-2 text-lg font-semibold text-muted">{t.howSub}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {t.steps.map((step, i) => (
              <article
                key={step.title}
                className="rounded-3xl border border-border bg-white p-7"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-black text-white">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-black leading-snug text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 font-semibold leading-relaxed text-muted">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Sports */}
      <section className="bg-warm-white py-16 lg:py-20">
        <div className="mx-auto w-full max-w-6xl px-5">
          <h2 className="text-3xl font-black text-ink sm:text-4xl">
            {t.sportsTitle}
          </h2>
          <p className="mt-2 text-lg font-semibold text-muted">
            {t.sportsSub}
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {SPORT_PHOTOS.map((photo) => (
              <figure
                key={photo.src}
                className="relative min-h-[180px] overflow-hidden rounded-3xl sm:min-h-[220px]"
              >
                <Image
                  src={photo.src}
                  alt={t.sports[photo.key]}
                  fill
                  sizes="(max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-navy/85 px-4 py-1.5 text-sm font-black text-warm-white">
                  {t.sports[photo.key]}
                </figcaption>
              </figure>
            ))}
            <div className="flex min-h-[180px] flex-col justify-center rounded-3xl bg-navy p-6 sm:min-h-[220px]">
              <p className="text-2xl font-black leading-snug text-warm-white">
                {t.sportsMore}
              </p>
              <p className="mt-2 font-semibold text-warm-white/70">
                {t.sportsMoreSub}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Organizers */}
      <section className="bg-soft py-16 lg:py-20">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="rounded-[2rem] bg-navy px-6 py-12 sm:px-12 lg:px-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black leading-tight text-warm-white sm:text-4xl">
                {t.orgTitle}
              </h2>
              <p className="mt-4 text-lg font-semibold leading-relaxed text-warm-white/80">
                {t.orgSub}
              </p>
              <ul className="mt-7 space-y-3">
                {t.orgBullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-3 font-bold text-warm-white"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime text-sm font-black text-ink">
                      ✓
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-9 inline-block rounded-full bg-primary px-7 py-4 font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30"
              >
                {t.orgCta}
              </Link>
              <p className="mt-4 text-sm font-semibold text-warm-white/60">
                {t.orgNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-midnight pb-10 pt-14 text-warm-white">
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Image
                src="/logo-desktop.png"
                alt="Plaiyo"
                width={1672}
                height={455}
                className="h-8 w-auto"
              />
              <p className="mt-4 max-w-sm font-black leading-snug">
                {t.footerTagline}
              </p>
              <p className="mt-3 max-w-sm font-semibold leading-relaxed text-warm-white/70">
                {t.footerAbout}
              </p>
            </div>
            <nav aria-label={t.footerLinks}>
              <h3 className="text-xs font-black uppercase tracking-widest text-lime">
                {t.footerLinks}
              </h3>
              <ul className="mt-4 space-y-3 font-bold">
                <li>
                  <Link href="/terms" className="hover:underline">
                    {t.footerTerms}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:underline">
                    {t.footerPrivacy}
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:garrido.coraline@gmail.com"
                    className="hover:underline"
                  >
                    {t.footerContact} — garrido.coraline@gmail.com
                  </a>
                </li>
              </ul>
            </nav>
            <nav aria-label={t.footerAccount}>
              <h3 className="text-xs font-black uppercase tracking-widest text-lime">
                {t.footerAccount}
              </h3>
              <ul className="mt-4 space-y-3 font-bold">
                <li>
                  <Link href="/login" className="hover:underline">
                    {t.login}
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:underline">
                    {t.signup}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <p className="mt-12 border-t border-white/15 pt-6 text-sm font-semibold text-warm-white/60">
            {t.footerRights}
          </p>
        </div>
      </footer>
    </div>
  );
}
