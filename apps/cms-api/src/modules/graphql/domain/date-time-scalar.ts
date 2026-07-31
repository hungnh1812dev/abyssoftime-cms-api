import { GraphQLError, GraphQLScalarType, Kind, type ValueNode } from "graphql";

function toISOString(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new GraphQLError("DateTime cannot represent an invalid Date instance", { extensions: { code: "BAD_USER_INPUT" } });
    }
    return value.toISOString();
  }
  throw new GraphQLError(`DateTime cannot represent a non-Date value: ${JSON.stringify(value)}`, { extensions: { code: "BAD_USER_INPUT" } });
}

function parseISOString(value: unknown): Date {
  if (typeof value !== "string") {
    throw new GraphQLError(`DateTime cannot represent a non-string value: ${JSON.stringify(value)}`, { extensions: { code: "BAD_USER_INPUT" } });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError(`DateTime cannot parse invalid ISO-8601 string: ${JSON.stringify(value)}`, { extensions: { code: "BAD_USER_INPUT" } });
  }
  return date;
}

function parseLiteral(node: ValueNode): Date {
  if (node.kind !== Kind.STRING) {
    throw new GraphQLError("DateTime can only parse string literals", { extensions: { code: "BAD_USER_INPUT" } });
  }
  return parseISOString(node.value);
}

export const DateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description: "ISO-8601 date-time string, serialized from and parsed into a real Date.",
  serialize: toISOString,
  parseValue: parseISOString,
  parseLiteral,
});
