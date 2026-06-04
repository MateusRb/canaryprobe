import type { Check, ValidationIssue } from "../types.js";

const kebabCasePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateCheck(check: unknown, file?: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isObject(check)) {
    return [{ file, message: "Default export must be a check object returned by defineCheck()" }];
  }

  const name = check.name;
  const type = check.type;

  if (typeof name !== "string" || name.length === 0) {
    issues.push({ file, message: "Check must define a non-empty name" });
  } else if (!kebabCasePattern.test(name)) {
    issues.push({ file, checkName: name, message: "Check name must be kebab-case" });
  }

  if (type !== "http" && type !== "browser") {
    issues.push({ file, checkName: typeof name === "string" ? name : undefined, message: "Check type must be \"http\" or \"browser\"" });
    return issues;
  }

  if (type === "http") {
    if (!isObject(check.request)) {
      issues.push({ file, checkName: typeof name === "string" ? name : undefined, message: "HTTP check must define a request object" });
    } else if (typeof check.request.url !== "string" || check.request.url.length === 0) {
      issues.push({ file, checkName: typeof name === "string" ? name : undefined, message: "HTTP check request must define a non-empty url" });
    }
  }

  if (type === "browser" && typeof check.run !== "function") {
    issues.push({ file, checkName: typeof name === "string" ? name : undefined, message: "Browser check must define an async run function" });
  }

  return issues;
}

export function validateChecks(checks: Array<{ check: unknown; file?: string }>): ValidationIssue[] {
  const issues = checks.flatMap(({ check, file }) => validateCheck(check, file));
  const seen = new Map<string, string | undefined>();

  for (const { check, file } of checks) {
    if (!isObject(check) || typeof check.name !== "string") {
      continue;
    }

    const previous = seen.get(check.name);

    if (seen.has(check.name)) {
      issues.push({
        file,
        checkName: check.name,
        message: `Duplicate check name "${check.name}" also found in ${previous ?? "another file"}`
      });
    } else {
      seen.set(check.name, file);
    }
  }

  return issues;
}

export function assertValidChecks(checks: Array<{ check: unknown; file?: string }>): asserts checks is Array<{ check: Check; file?: string }> {
  const issues = validateChecks(checks);

  if (issues.length > 0) {
    throw new Error(formatValidationIssues(issues));
  }
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues
    .map((issue) => {
      const location = issue.file ? `${issue.file}: ` : "";
      const check = issue.checkName ? `[${issue.checkName}] ` : "";
      return `${location}${check}${issue.message}`;
    })
    .join("\n");
}
