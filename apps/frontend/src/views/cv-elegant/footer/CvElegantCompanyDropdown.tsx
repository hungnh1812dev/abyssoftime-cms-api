"use client";

import type { CvElegantListItemType } from "../cv-elegant.types";
import { useParams, useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CvElegantCompanyDropdownProps {
  items: CvElegantListItemType[];
}

export const CvElegantCompanyDropdown = ({ items }: CvElegantCompanyDropdownProps) => {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale ?? "en";

  if (!items || items.length === 0) return null;

  return (
    <Select onValueChange={(documentId) => router.push(`/${locale}/cv-2/${documentId}`)}>
      <SelectTrigger className="h-8 w-44 text-xs">
        <SelectValue placeholder="Company CVs" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.documentId} value={item.documentId} className="text-xs">
            {item.companyName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
