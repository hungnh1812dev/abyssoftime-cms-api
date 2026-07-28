import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  it('renders with the given aria-label', () => {
    render(<Checkbox aria-label="Select row" />);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument();
  });

  it('reflects unchecked state via aria-checked', () => {
    render(<Checkbox aria-label="Select row" checked={false} />);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toHaveAttribute('aria-checked', 'false');
  });

  it('reflects checked state via aria-checked', () => {
    render(<Checkbox aria-label="Select row" checked={true} />);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toHaveAttribute('aria-checked', 'true');
  });

  it('fires onCheckedChange with the new value when clicked', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Select row" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select row' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('toggles when clicked without a controlling checked prop', async () => {
    render(<Checkbox aria-label="Select row" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Select row' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });
});
