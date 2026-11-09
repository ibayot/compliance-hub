/** Theme-aware emphasis for prefilled ticket and feedback fields. */
export const populatedFieldSx = (populated: boolean) =>
  populated
    ? {
        '& .MuiInputBase-input': { color: 'text.primary', fontStyle: 'italic' },
        '& .MuiInputBase-input.Mui-disabled': {
          color: 'text.primary',
          WebkitTextFillColor: 'currentColor',
          fontStyle: 'italic',
        },
      }
    : undefined;
