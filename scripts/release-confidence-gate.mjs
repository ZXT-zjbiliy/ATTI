#!/usr/bin/env node

import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

const args = new Set(process.argv.slice(2));

const includeE2e = args.has("--with-e2e");
const advisoryQuality = args.has("--advisory-quality");
const strictQuality = args.has("--strict-quality");

const npmExecPath = process.env.npm_execpath;
const pnpmCommand = npmExecPath
  ? process.execPath
  : process.platform === "win32"
    ? "pnpm.cmd"
    : "pnpm";
const pnpmArgsPrefix = npmExecPath ? [npmExecPath] : [];

const requiredSteps = [
  { name: "typecheck", script: "typecheck" },
  { name: "unit tests", script: "test:unit" },
  { name: "integration tests", script: "test:integration" },
  { name: "Edge build", script: "build:edge" }
];

if (includeE2e) {
  requiredSteps.push({ name: "browser e2e", script: "test:e2e" });
}

const qualitySteps = [
  { name: "lint", script: "lint" },
  { name: "format check", script: "format:check" }
];

function formatDuration(startedAt) {
  return `${((performance.now() - startedAt) / 1000).toFixed(1)}s`;
}

function runPnpmScript(step) {
  const startedAt = performance.now();

  console.log(`\n[release-gate] START ${step.name}: pnpm ${step.script}`);

  return new Promise((resolve) => {
    const child = spawn(pnpmCommand, [...pnpmArgsPrefix, "run", step.script], {
      stdio: "inherit",
      shell: false
    });

    child.on("error", (error) => {
      resolve({
        ...step,
        status: "failed",
        duration: formatDuration(startedAt),
        error: error.message
      });
    });

    child.on("close", (code, signal) => {
      resolve({
        ...step,
        status: code === 0 ? "passed" : "failed",
        duration: formatDuration(startedAt),
        code,
        signal
      });
    });
  });
}

function printSummary(requiredResults, qualityResults) {
  console.log("\n[release-gate] Summary");

  for (const result of requiredResults) {
    const marker = result.status === "passed" ? "PASS" : "FAIL";
    console.log(`- ${marker} ${result.name} (${result.duration})`);
  }

  if (qualityResults.length > 0) {
    const qualityMode = strictQuality ? "strict" : "advisory";
    console.log(`\n[release-gate] Quality checks (${qualityMode})`);

    for (const result of qualityResults) {
      const marker = result.status === "passed" ? "PASS" : "FAIL";
      console.log(`- ${marker} ${result.name} (${result.duration})`);
    }
  }
}

async function main() {
  const requiredResults = [];
  const qualityResults = [];

  console.log("[release-gate] Required gate: typecheck -> unit -> integration -> Edge build");

  for (const step of requiredSteps) {
    const result = await runPnpmScript(step);
    requiredResults.push(result);

    if (result.status !== "passed") {
      printSummary(requiredResults, qualityResults);
      console.error(`\n[release-gate] Required step failed: ${step.name}`);
      process.exitCode = 1;
      return;
    }
  }

  if (advisoryQuality || strictQuality) {
    for (const step of qualitySteps) {
      const result = await runPnpmScript(step);
      qualityResults.push(result);

      if (strictQuality && result.status !== "passed") {
        printSummary(requiredResults, qualityResults);
        console.error(`\n[release-gate] Strict quality step failed: ${step.name}`);
        process.exitCode = 1;
        return;
      }
    }
  }

  printSummary(requiredResults, qualityResults);

  const advisoryFailures = qualityResults.filter((result) => result.status !== "passed");
  if (advisoryQuality && advisoryFailures.length > 0) {
    console.warn(
      "\n[release-gate] Advisory quality checks failed but did not fail the release gate."
    );
  }

  console.log("\n[release-gate] PASS");
}

await main();
