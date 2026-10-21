"use client";

import { useState } from "react";

type SportOption = { id: string; name: string };
type CategoryGroup = { name: string; sports: SportOption[] };

/**
 * Chip grid for the ONBOARDING sports step, with the step's selection
 * cap made tangible: a live « N of 3 selected » counter at the top,
 * and once the cap is reached every unselected chip disables (greyed,
 * not tappable) until one is deselected. Selected chips always stay
 * tappable so the user can swap.
 *
 * The checkboxes are real form inputs named « sport_ids » — the exact
 * contract the step's server action (and /profile/edit's pattern) uses
 * — so the surrounding server-rendered <form> and its replace-
 * semantics save are unchanged; this component only owns the picking
 * interaction. The cap is ALSO enforced in the server action: the
 * client behaviour is the feel, the server is the rule.
 *
 * Scope: this cap is an onboarding-only product rule. /profile/edit
 * deliberately does NOT use this component — there, users can pick as
 * many sports as they want (« You can always change them later »).
 */
export default function SportsPicker({
  categories,
  initialSelected,
  max,
}: {
  categories: CategoryGroup[];
  initialSelected: string[];
  max: number;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(initialSelected),
  );
  const atCap = selected.size >= max;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < max) {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-black text-ink">Choose up to {max}</p>
        <p aria-live="polite" className="text-sm font-bold text-muted">
          {selected.size} of {max} selected
        </p>
      </div>

      <div className="mt-5 space-y-6">
        {categories.map((category) => (
          <fieldset key={category.name}>
            <legend className="text-xs font-black uppercase tracking-widest text-primary">
              {category.name}
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {category.sports.map((sport) => {
                const isSelected = selected.has(sport.id);
                const isDisabled = !isSelected && atCap;
                return (
                  <label
                    key={sport.id}
                    aria-disabled={isDisabled || undefined}
                    className={
                      isDisabled
                        ? "flex cursor-not-allowed items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-bold text-muted opacity-45"
                        : "flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-bold text-ink has-checked:border-primary has-checked:bg-primary has-checked:text-white"
                    }
                  >
                    <input
                      type="checkbox"
                      name="sport_ids"
                      value={sport.id}
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => toggle(sport.id)}
                      className="sr-only"
                    />
                    {sport.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
