export class TestReporter {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  record(tier, req, id, name, passed, durationMs, error = null) {
    this.results.push({
      tier,
      req,
      id,
      name,
      passed,
      durationMs,
      error
    });
  }

  async runTest(meta, fn) {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      const res = {
        tier: meta.tier,
        req: meta.req,
        id: meta.id,
        name: meta.name,
        passed: true,
        durationMs,
        error: null
      };
      this.results.push(res);
      this.printTestResult(res);
    } catch (err) {
      const durationMs = Date.now() - start;
      const res = {
        tier: meta.tier,
        req: meta.req,
        id: meta.id,
        name: meta.name,
        passed: false,
        durationMs,
        error: err
      };
      this.results.push(res);
      this.printTestResult(res);
    }
  }

  printHeader() {
    console.log('='.repeat(80));
    console.log(' OmniSuite E2E Layout & UI Refinement Test Suite');
    console.log('='.repeat(80));
    console.log(` Execution Mode: Headless Chrome + DOM Geometry + AST Verification`);
    console.log(` Node.js: ${process.version} | Platform: ${process.platform} x64`);
    console.log('-'.repeat(80));
  }

  printTierHeader(tierName) {
    console.log(`\n[${tierName}]`);
  }

  printTestResult(res) {
    const mark = res.passed ? '  ✓' : '  ✗';
    const tag = `[${res.id}]`;
    const line = `${mark} ${tag} ${res.name} (${res.durationMs}ms)`;
    if (res.passed) {
      console.log(`\x1b[32m${line}\x1b[0m`);
    } else {
      console.log(`\x1b[31m${line}\x1b[0m`);
      if (res.error) {
        console.log(`      \x1b[31mError: ${res.error.message || res.error}\x1b[0m`);
      }
    }
  }

  printSummary() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const tiers = [1, 2, 3, 4];
    const tierStats = {};

    for (const t of tiers) {
      const tierResults = this.results.filter(r => r.tier === t);
      const passed = tierResults.filter(r => r.passed).length;
      const failed = tierResults.filter(r => !r.passed).length;
      tierStats[t] = { total: tierResults.length, passed, failed };
    }

    const totalPassed = this.results.filter(r => r.passed).length;
    const totalFailed = this.results.filter(r => !r.passed).length;
    const allPassed = totalFailed === 0 && this.results.length > 0;

    console.log('\n' + '='.repeat(80));
    console.log(' TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    console.log(` Tier 1 (Feature Coverage):        ${tierStats[1].passed} Passed, ${tierStats[1].failed} Failed (${tierStats[1].total} Total)`);
    console.log(` Tier 2 (Boundary & Corner Cases):  ${tierStats[2].passed} Passed, ${tierStats[2].failed} Failed (${tierStats[2].total} Total)`);
    console.log(` Tier 3 (Cross-Feature Pairwise):   ${tierStats[3].passed} Passed, ${tierStats[3].failed} Failed (${tierStats[3].total} Total)`);
    console.log(` Tier 4 (Real-World Scenarios):     ${tierStats[4].passed} Passed, ${tierStats[4].failed} Failed (${tierStats[4].total} Total)`);
    console.log('-'.repeat(80));
    console.log(` Overall Results:                  ${totalPassed} Passed, ${totalFailed} Failed (${this.results.length} Executed)`);
    console.log(` Execution Duration:               ${totalTime}s`);
    console.log(` Final Exit Code:                  ${allPassed ? 0 : 1}`);
    console.log('='.repeat(80) + '\n');

    return allPassed ? 0 : 1;
  }
}
