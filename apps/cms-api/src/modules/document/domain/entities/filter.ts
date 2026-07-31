export type FilterOperator = "$eq" | "$ne" | "$contains" | "$gt" | "$gte" | "$lt" | "$lte" | "$in" | "$notIn";

export type FilterValue = string | number | boolean | Date | (string | number)[];

export interface ParsedFilter {
  column: string;
  operator: FilterOperator;
  value: FilterValue;
}

export type FilterNode = ParsedFilter | { and: FilterNode[] } | { or: FilterNode[] } | { not: FilterNode };
