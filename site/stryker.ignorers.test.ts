import { describe, expect, it } from "vitest";
import { strykerPlugins } from "./stryker.ignorers.mjs";

// Stryker hands the ignorer a Babel path: a node and the path of its parent. These build the
// smallest such chain for a snippet, outermost node first, so each case reads as the code it
// stands for.
type Node = { type: string; [key: string]: unknown };
type Path = { node: Node; parentPath: Path | null };

function pathTo(...nodes: Node[]): Path {
  let path: Path | null = null;
  for (const node of nodes) path = { node, parentPath: path };
  return path!;
}

const REASON = "Tailwind class names are presentation, checked by eye, not by tests";
const { shouldIgnore } = strykerPlugins[0]!.value;

const str = (value: string): Node => ({ type: "StringLiteral", value });
const attribute = (name: string): Node => ({ type: "JSXAttribute", name: { type: "JSXIdentifier", name } });
const container = (): Node => ({ type: "JSXExpressionContainer" });
const template = (expressions: Node[]): Node => ({ type: "TemplateLiteral", expressions, quasis: [] });
const declarator = (name: string | undefined, init: Node): Node => ({ type: "VariableDeclarator", id: { name }, init });

describe("the class-names ignorer", () => {
  it("is registered as an Ignore plugin named class-names", () => {
    expect(strykerPlugins.map(({ kind, name }) => ({ kind, name }))).toEqual([{ kind: "Ignore", name: "class-names" }]);
  });

  it("ignores a plain class string: className=\"a b\"", () => {
    expect(shouldIgnore(pathTo(attribute("className"), str("a b")))).toBe(REASON);
  });

  it("ignores a template with no expressions: className={`a b`}", () => {
    expect(shouldIgnore(pathTo(attribute("className"), container(), template([])))).toBe(REASON);
  });

  it("mutates a template with expressions, so the condition inside it is still tested: className={`a ${on ? \"b\" : \"c\"}`}", () => {
    const test: Node = { type: "Identifier", name: "on" };
    const conditional: Node = { type: "ConditionalExpression", test, consequent: str("b"), alternate: str("c") };
    const t = template([conditional]);
    expect(shouldIgnore(pathTo(attribute("className"), container(), t))).toBeUndefined();
    // The class strings inside it are still left alone.
    expect(shouldIgnore(pathTo(attribute("className"), container(), t, conditional, str("b")))).toBe(REASON);
  });

  it("ignores either branch of a condition, but not its test: className={on ? \"a\" : \"b\"}", () => {
    const test = str("x");
    const conditional: Node = { type: "ConditionalExpression", test, consequent: str("a"), alternate: str("b") };
    expect(shouldIgnore(pathTo(attribute("className"), container(), conditional, str("a")))).toBe(REASON);
    expect(shouldIgnore(pathTo(attribute("className"), container(), conditional, test))).toBeUndefined();
  });

  it("ignores strings joined with +, but not compared: className={\"a \" + b}, className={a === \"b\"}", () => {
    const plus: Node = { type: "BinaryExpression", operator: "+" };
    const equals: Node = { type: "BinaryExpression", operator: "===" };
    expect(shouldIgnore(pathTo(attribute("className"), container(), plus, str("a ")))).toBe(REASON);
    expect(shouldIgnore(pathTo(attribute("className"), container(), equals, str("b")))).toBeUndefined();
  });

  it("ignores a string held by a constant whose name ends in Class: const linkClass = \"a b\"", () => {
    const value = str("a b");
    expect(shouldIgnore(pathTo(declarator("linkClass", value), value))).toBe(REASON);
  });

  it.each([
    ["a string in another attribute: alt=\"a b\"", pathTo(attribute("alt"), str("a b"))],
    ["a constant with another name: const label = \"a b\"", (() => {
      const value = str("a b");
      return pathTo(declarator("label", value), value);
    })()],
    ["a constant bound by a pattern: const { a } = \"a b\"", (() => {
      const value = str("a b");
      return pathTo(declarator(undefined, value), value);
    })()],
    ["a string passed to a call: f(\"a b\")", pathTo({ type: "CallExpression" }, str("a b"))],
    ["a string with no parent", pathTo(str("a b"))],
    ["a class string reaching nothing: `a b` alone", pathTo(template([]))],
  ])("does not ignore %s", (_name, path) => {
    expect(shouldIgnore(path)).toBeUndefined();
  });

  it("does not ignore a node that is not a string, even in className", () => {
    expect(shouldIgnore(pathTo(attribute("className"), container(), { type: "Identifier", name: "a" }))).toBeUndefined();
  });

  it("does not ignore a template held by a constant that is not its value", () => {
    const value = template([]);
    expect(shouldIgnore(pathTo(declarator("linkClass", str("other")), value))).toBeUndefined();
  });
});
