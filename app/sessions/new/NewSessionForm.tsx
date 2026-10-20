"use client";

import { useMemo, useState } from "react";
import { createSession } from "./actions";

type Sport = { id: string; name: string; category: string };

const RUNNING_SPORTS = ["Running", "Trail Running", "Track & Field"];
const POPULAR = ["Basketball", "Soccer / Football", "Running"];
const PACE_RE = /^[0-9]{1,2}:[0-5][0-9]$/;

export default function NewSessionForm({
  sports,
  defaultCity,
  error,
}: {
  sports: Sport[];
  defaultCity: string;
  error?: string;
}) {
  const [step, setStep] = useState(1);
  const [sportId, setSportId] = useState("");
  const [pace, setPace] = useState("");
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState("km");
  const [price, setPrice] = useState("0");

  const sport = useMemo(
    () => sports.find((s) => s.id === sportId) ?? null,
    [sports, sportId],
  );
  const isRunning = sport ? RUNNING_SPORTS.includes(sport.name) : false;

  const paceValid = !isRunning || PACE_RE.test(pace.trim());
  const distanceValid =
    !isRunning || (distance !== "" && !Number.isNaN(Number(distance)) && Number(distance) >= 0.1);
  const step2Valid = paceValid && distanceValid;

  const categories = useMemo(() => {
    const map = new Map<string, Sport[]>();
    for (const s of sports) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()];
  }, [sports]);

  const popular = POPULAR.map((name) =>
    sports.find((s) => s.name === name),
  ).filter((s): s is Sport => !!s);

  const priceCents = Math.round((Number(price) || 0) * 100);
  const commission = Math.round(priceCents * 0.05);

  const inputCls =
    "mt-1 w-full rounded-2xl border border-border bg-white px-3 py-2.5 font-semibold outline-none focus:border-primary";
  const labelCls = "block text-sm font-bold text-muted";

  return (
    <form action={createSession} className="space-y-5">
      {error && (
        <p role="alert" className="rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
          {error}
        </p>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
              n <= step ? "bg-primary text-white" : "border border-border bg-white text-muted"
            }`}
          >
            {n}
          </span>
        ))}
        <span className="ml-1 text-sm font-bold text-muted">Step {step} of 3</span>
      </div>

      <section className={step === 1 ? "space-y-4" : "hidden"}>
          <div>
            <h1 className="text-2xl font-black text-ink">Set Up Your Session</h1>
            <span className="mt-1 block h-1 w-10 rounded bg-lime" />
            <p className="mt-2 font-semibold text-muted">
              Choose the sport for your session. You can add more details next.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-black text-muted">🔥 Popular sports</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {popular.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSportId(s.id)}
                  aria-pressed={sportId === s.id}
                  className={`rounded-3xl border bg-white p-3 font-black text-ink ${
                    sportId === s.id ? "border-primary ring-2 ring-primary" : "border-border"
                  }`}
                >
                  {s.name.replace(" / Football", "")}
                </button>
              ))}
            </div>
          </div>
          <input type="hidden" name="sport_id" value={sportId} />
          {categories.map(([category, list]) => (
            <div key={category}>
              <h3 className="text-xs font-black uppercase tracking-wider text-muted">
                {category}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {list.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSportId(s.id)}
                    aria-pressed={sportId === s.id}
                    className={`rounded-full border px-3.5 py-2 text-sm font-bold ${
                      sportId === s.id
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-white text-ink"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            disabled={!sportId}
            onClick={() => setStep(2)}
            className={`w-full rounded-full py-3.5 font-black ${
              sportId ? "bg-lime text-ink" : "bg-lime/50 text-ink/50"
            }`}
          >
            Next →
          </button>
      </section>

      <section className={step === 2 ? "space-y-4" : "hidden"}>
          <h1 className="text-2xl font-black text-ink">When &amp; Where</h1>
          <label className={labelCls}>
            Location
            <input name="location" placeholder="Enter location or address" className={inputCls} />
            <span className="mt-1 block text-xs font-semibold">
              For everyone&apos;s safety, choose a public venue (park, gym, trailhead, court) rather than a private address.
            </span>
          </label>
          <label className={labelCls}>
            City
            <input name="city" defaultValue={defaultCity} className={inputCls} />
          </label>
          <div className="flex gap-3">
            <label className={`${labelCls} flex-1`}>
              Date
              <input name="date" type="date" className={inputCls} />
            </label>
            <label className={`${labelCls} flex-1`}>
              Time
              <input name="time" type="time" className={inputCls} />
            </label>
          </div>
          <div className="flex gap-3">
            <label className={`${labelCls} flex-1`}>
              Participants
              <input name="capacity" type="number" min={2} defaultValue={2} className={inputCls} />
            </label>
            <label className={`${labelCls} flex-1`}>
              Duration (minutes)
              <input name="duration" type="number" min={1} defaultValue={60} className={inputCls} />
            </label>
          </div>

          {isRunning && (
            <div className="flex items-start gap-3">
              <label className={`${labelCls} flex-1`}>
                Average Pace
                <input
                  name="average_pace"
                  value={pace}
                  onChange={(e) => setPace(e.target.value)}
                  placeholder="05:30"
                  inputMode="numeric"
                  className={inputCls}
                  aria-invalid={pace !== "" && !paceValid}
                />
                {pace !== "" && !paceValid && (
                  <span className="mt-1 block text-xs font-bold text-coral">
                    Use the MM:SS format, e.g. 05:30.
                  </span>
                )}
              </label>
              <label className={`${labelCls} flex-1`}>
                Distance
                <span className="flex gap-2">
                  <input
                    name="distance_value"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className={inputCls}
                    aria-invalid={distance !== "" && !distanceValid}
                  />
                  <select
                    name="distance_unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="mt-1 rounded-2xl border border-border bg-white px-2 font-bold"
                    aria-label="Distance unit"
                  >
                    <option value="km">km</option>
                    <option value="mile">mile</option>
                  </select>
                </span>
                {distance !== "" && !distanceValid && (
                  <span className="mt-1 block text-xs font-bold text-coral">
                    Distance must be at least 0.1.
                  </span>
                )}
              </label>
            </div>
          )}

          <label className={labelCls}>
            Skill Level
            <select name="skill_level" defaultValue="all" className={inputCls}>
              <option value="all">All levels welcome</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <span className="mt-1 block text-xs font-semibold">
              Sets expectations for who should join — how experienced or competitive players should be for this session.
            </span>
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-full border border-border bg-white py-3 font-black text-ink"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!step2Valid}
              onClick={() => setStep(3)}
              className={`flex-1 rounded-full py-3 font-black ${
                step2Valid ? "bg-lime text-ink" : "bg-lime/50 text-ink/50"
              }`}
            >
              Next →
            </button>
          </div>
      </section>

      <section className={step === 3 ? "space-y-4" : "hidden"}>
          <h1 className="text-2xl font-black text-ink">Final Details</h1>
          <label className={labelCls}>
            Event Type
            <select
              name="event_type"
              value={priceCents > 0 ? "paid" : "free"}
              onChange={(e) => {
                if (e.target.value === "free") setPrice("0");
                else if (priceCents === 0) setPrice("10");
              }}
              className={inputCls}
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          {priceCents > 0 && (
            <label className={labelCls}>
              Price per person ($)
              <input
                name="price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
              />
              <span className="mt-1 block text-xs font-semibold">
                Plaiyo commission: 5% (${(commission / 100).toFixed(2)}). During the pilot, payment happens off-platform — no payment is collected in the app.
              </span>
            </label>
          )}
          {priceCents === 0 && <input type="hidden" name="price" value="0" />}

          <div className="space-y-2 font-semibold text-ink">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="recurring" /> Recurring Session
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="host_attends" defaultChecked /> I will attend this session
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="women_only" /> Women only session
            </label>
          </div>

          <label className={labelCls}>
            Session Title
            <input name="title" required placeholder="Session title" className={inputCls} />
            {sport && (
              <span className="mt-1 inline-block rounded-full bg-cobalt/10 px-3 py-1 text-xs font-bold text-cobalt">
                Use: “Evening {sport.name}”
              </span>
            )}
          </label>
          <label className={labelCls}>
            Note (optional)
            <textarea name="description" rows={3} placeholder="Add any extra info for participants..." className={inputCls} />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-full border border-border bg-white py-3 font-black text-ink"
            >
              Back
            </button>
            <button type="submit" className="flex-1 rounded-full bg-primary py-3 font-black text-white">
              Publish session →
            </button>
          </div>
      </section>
    </form>
  );
}
