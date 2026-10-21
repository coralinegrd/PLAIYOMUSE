import type { Gender } from "@/lib/profileGate";

const OPTIONS: { value: Gender; label: string }[] = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "non_binary", label: "Non-binary" },
];

/**
 * Gender selector — three radio options whose values mirror the
 * profiles.gender CHECK constraint ('man' | 'woman' | 'non_binary')
 * exactly. Gender exists for one rule (men cannot join women-only
 * sessions) and is only ever rendered on screens the owner sees about
 * themselves: the onboarding name step ("auth" variant) and the
 * profile edit form ("card" variant). It is never shown publicly.
 * Presentational only — safe in Server Components; the enclosing form
 * reads `gender` from its FormData.
 */
export default function GenderField({
  label,
  defaultValue,
  variant = "auth",
}: {
  label: string;
  defaultValue?: string | null;
  variant?: "auth" | "card";
}) {
  if (variant === "card") {
    // Matches the edit form's chip family (see the "My sports" fieldset).
    return (
      <fieldset>
        <legend className="text-sm font-bold text-muted">{label}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-bold text-ink has-checked:bg-primary has-checked:text-white"
            >
              <input
                type="radio"
                name="gender"
                value={option.value}
                defaultChecked={defaultValue === option.value}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  // Onboarding/auth family: full-width tappable pills, selected = solid
  // Electric Blue, in the TextField visual register.
  return (
    <fieldset>
      <legend className="text-[15px] font-extrabold text-ink">{label}</legend>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center justify-center rounded-2xl border border-border bg-white px-2 py-3.5 text-center font-bold text-ink has-checked:border-primary has-checked:bg-primary has-checked:text-white"
          >
            <input
              type="radio"
              name="gender"
              value={option.value}
              defaultChecked={defaultValue === option.value}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
