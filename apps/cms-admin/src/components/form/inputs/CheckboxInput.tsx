import { type ComponentProps } from 'react';
import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export function CheckboxInput({ className, ...props }: ComponentProps<typeof ShadcnCheckbox>) {
  return <ShadcnCheckbox className={cn('inline-flex items-center justify-center', className)} {...props} />;
}
