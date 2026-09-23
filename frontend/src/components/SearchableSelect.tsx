'use client';

import { Autocomplete, Chip, SxProps, TextField, TextFieldProps, Theme } from '@mui/material';

export type SearchableSelectValue = string | number;

export interface SearchableSelectOption<T extends SearchableSelectValue = SearchableSelectValue> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface CommonProps<T extends SearchableSelectValue> {
  options: SearchableSelectOption<T>[];
  label: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'small' | 'medium';
  helperText?: string;
  placeholder?: string;
  error?: boolean;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
  textFieldProps?: Omit<TextFieldProps, 'label' | 'value' | 'onChange' | 'select'>;
}

interface SingleProps<T extends SearchableSelectValue> extends CommonProps<T> {
  value: T | null | undefined | '';
  onChange: (value: T | null) => void;
  clearable?: boolean;
}

export function SearchableSelect<T extends SearchableSelectValue>({
  options,
  value,
  onChange,
  label,
  clearable = true,
  disabled = false,
  required = false,
  size = 'medium',
  helperText,
  placeholder,
  error,
  fullWidth = true,
  sx,
  textFieldProps,
}: SingleProps<T>) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Autocomplete
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option?.value ?? null)}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selectedOption) => option.value === selectedOption.value}
      getOptionDisabled={(option) => Boolean(option.disabled)}
      disabled={disabled}
      disableClearable={!clearable}
      fullWidth={fullWidth}
      sx={sx}
      autoHighlight
      renderInput={(params) => (
        <TextField
          {...params}
          {...textFieldProps}
          label={label}
          required={required}
          size={size}
          helperText={helperText}
          placeholder={placeholder}
          error={error}
        />
      )}
    />
  );
}

interface MultipleProps<T extends SearchableSelectValue> extends CommonProps<T> {
  value: T[];
  onChange: (value: T[]) => void;
}

export function SearchableMultiSelect<T extends SearchableSelectValue>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  required = false,
  size = 'medium',
  helperText,
  placeholder,
  error,
  fullWidth = true,
  sx,
  textFieldProps,
}: MultipleProps<T>) {
  const selected = options.filter((option) => value.includes(option.value));

  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      onChange={(_, selectedOptions) => onChange(selectedOptions.map((option) => option.value))}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selectedOption) => option.value === selectedOption.value}
      getOptionDisabled={(option) => Boolean(option.disabled)}
      disabled={disabled}
      fullWidth={fullWidth}
      sx={sx}
      autoHighlight
      filterSelectedOptions
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip label={option.label} size="small" {...getTagProps({ index })} key={option.value} />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          {...textFieldProps}
          label={label}
          required={required}
          size={size}
          helperText={helperText}
          placeholder={value.length === 0 ? placeholder : undefined}
          error={error}
        />
      )}
    />
  );
}
