export default function SelectField({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  invalid = false,
  descriptionId,
}) {
  return (
    <div className="selectField">
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={descriptionId}
        onChange={(event) =>
          onChange(
            name,
            typeof value === 'number' ? Number(event.target.value) : event.target.value,
          )
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {typeof option === 'number' ? String(option).padStart(2, '0') + ':00' : option}
          </option>
        ))}
      </select>
    </div>
  )
}
