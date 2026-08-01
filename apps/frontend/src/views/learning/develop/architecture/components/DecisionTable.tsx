"use client";

import type { BadgeColor, TableCell as TableCellType, TableData } from "../data/types";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DecisionTableProps {
  data: TableData;
}

const BADGE_COLOR_MAP: Record<BadgeColor, string> = {
  green: "bg-green-500/15 text-green-600 dark:text-green-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  red: "bg-red-500/15 text-red-500 dark:text-red-400",
  yellow: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
};

function renderCell(cell: TableCellType) {
  if (typeof cell === "string") return cell;
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold", BADGE_COLOR_MAP[cell.color])}>{cell.badge}</span>;
}

export function DecisionTable({ data }: DecisionTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/60 hover:bg-transparent">
            {data.headers.map((header, i) => (
              <TableHead key={i} className="bg-muted text-[0.72rem] font-bold text-foreground">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row, i) => (
            <TableRow key={i} className="border-border/40 transition-colors hover:bg-primary/5">
              {row.map((cell, j) => (
                <TableCell key={j} className="text-[0.8rem] text-foreground/85">
                  {renderCell(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
