"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

interface SearchInputProps {
  defaultValue?: string;
}

export function SearchInput({ defaultValue = "" }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasValue, setHasValue] = useState(!!defaultValue);

  const pushQuery = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHasValue(!!value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushQuery(value), 400);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    setHasValue(false);
    clearTimeout(debounceRef.current);
    pushQuery("");
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder="Search topics, hooks, concepts..."
        onChange={handleChange}
        className="w-full rounded-md border bg-muted/50 py-2 pl-9 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring dark:border-border/60 dark:bg-muted/30 dark:placeholder:text-muted-foreground/60"
      />
      {hasValue && (
        <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
