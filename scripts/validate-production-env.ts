import { getProductionEnvironmentIssues } from "../src/lib/platform/env-health";

const issues = getProductionEnvironmentIssues();

if (issues.length === 0) {
  console.log("Production environment validation passed with no launch warnings.");
  process.exit(0);
}

for (const issue of issues) {
  console.log(`[${issue.severity.toUpperCase()}] ${issue.title}`);
  console.log(`  ${issue.detail}`);
  console.log(`  Action: ${issue.action}`);
}

const critical = issues.filter((issue) => issue.severity === "critical");
if (critical.length > 0) {
  console.error(`Production environment validation failed: ${critical.length} critical issue(s).`);
  process.exit(1);
}

console.log(`Production environment validation completed with ${issues.length} non-blocking warning(s).`);
