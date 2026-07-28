import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "@/lib/pageSize";

interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
}

export function PageSizeSelector({ value, onChange }: PageSizeSelectorProps) {
  return (
    <Select value={String(value)} onValueChange={(size) => onChange(Number(size))}>
      <SelectTrigger size="sm" className="w-20" aria-label="Page size">
        <SelectValue placeholder="Page size">{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PAGE_SIZE_OPTIONS.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {size}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
