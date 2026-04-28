export type GroupComboboxItem = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

interface GroupComboboxProps {
  items: GroupComboboxItem[];
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  ariaLabel: string;
  triggerClassName?: string;
  contentClassName?: string;
  descriptionClassName?: string;
  caretClassName?: string;
  searchable?: boolean;
  matchTriggerWidth?: boolean;
}

export function GroupCombobox({
  items,
  value,
  onChange,
  disabled = false,
  placeholder,
  emptyText,
  ariaLabel,
  triggerClassName,
}: GroupComboboxProps) {
  const isDisabled = disabled || items.length === 0;
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={isDisabled}
      aria-label={ariaLabel}
      className={triggerClassName || "glass-input min-h-[44px] rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)]"}
      title={items.length === 0 ? emptyText : undefined}
    >
      <option value="">{items.length === 0 ? emptyText : placeholder}</option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.description ? `${item.label} - ${item.description}` : item.label}
        </option>
      ))}
    </select>
  );
}
