export type FilterOperator = "$eq" | "$ne" | "$contains" | "$gt" | "$gte" | "$lt" | "$lte";

export interface ParsedFilter {
  column: string;
  operator: FilterOperator;
  value: string | number | boolean;
}
