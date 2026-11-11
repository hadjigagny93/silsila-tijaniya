// Choix exclusif en boutons accolés ; de vrais boutons radio, donc envoyés avec le formulaire.
export function Segmented({
  name,
  options,
  defaultValue,
  label,
  disabled,
}: {
  name: string;
  options: { value: string; label: React.ReactNode }[];
  defaultValue: string;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="segmented" data-disabled={disabled || undefined}>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={option.value === defaultValue}
            disabled={disabled}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
