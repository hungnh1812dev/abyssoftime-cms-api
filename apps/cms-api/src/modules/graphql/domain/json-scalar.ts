import { GraphQLScalarType, Kind, type ValueNode } from "graphql";

function parseLiteral(node: ValueNode): unknown {
  switch (node.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return node.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(node.value);
    case Kind.OBJECT:
      return Object.fromEntries(node.fields.map((field) => [field.name.value, parseLiteral(field.value)]));
    case Kind.LIST:
      return node.values.map((value) => parseLiteral(value));
    case Kind.NULL:
      return null;
    default:
      return undefined;
  }
}

export const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  description: "Arbitrary JSON value (object, array, or primitive), passed through as-is.",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
});
