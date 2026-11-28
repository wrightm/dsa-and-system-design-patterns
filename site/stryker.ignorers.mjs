// The one rule for leaving mutants out of `pnpm mutation`, so the exclusion is in a single place.
//
// Stryker already leaves the string in `className="..."` alone. This extends that to the same
// Tailwind class strings when they reach `className` through an expression, such as
// `className={current ? "a b" : "c d"}`, or through a constant whose name ends in `Class`.
// Only the string literals are skipped: the condition that picks between them is still mutated.

/** Expressions a class string can pass through on its way to `className` unchanged. */
const CARRIERS = new Set(["ConditionalExpression", "BinaryExpression", "TemplateLiteral", "JSXExpressionContainer"]);

function flowsIntoClassName(path) {
  let child = path;
  let parent = path.parentPath;
  while (parent && CARRIERS.has(parent.node.type)) {
    // In `a ? b : c` only b and c reach the attribute; the test is behaviour.
    if (parent.node.type === "ConditionalExpression" && parent.node.test === child.node) return false;
    if (parent.node.type === "BinaryExpression" && parent.node.operator !== "+") return false;
    child = parent;
    parent = parent.parentPath;
  }
  if (!parent) return false;
  if (parent.node.type === "JSXAttribute") return parent.node.name.name === "className";
  if (parent.node.type === "VariableDeclarator") {
    return parent.node.init === child.node && /Class$/.test(parent.node.id.name ?? "");
  }
  return false;
}

const classNames = {
  shouldIgnore(path) {
    const type = path.node.type;
    if (type !== "StringLiteral" && type !== "TemplateLiteral") return undefined;
    return flowsIntoClassName(path) ? "Tailwind class names are presentation, checked by eye, not by tests" : undefined;
  },
};

export const strykerPlugins = [{ kind: "Ignore", name: "class-names", value: classNames }];
