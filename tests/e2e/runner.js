import { closeBrowser, getSharedPage } from './harness/browser.js';
import { TestReporter } from './harness/reporter.js';

// Tier 1 Specs
import * as r1Tier1 from './tier1/r1_mobile_nav.spec.js';
import * as r2Tier1 from './tier1/r2_buttons.spec.js';
import * as r3Tier1 from './tier1/r3_list_density.spec.js';
import * as r4Tier1 from './tier1/r4_filter_layout.spec.js';

// Tier 2 Specs
import * as r1Tier2 from './tier2/r1_mobile_nav_boundaries.spec.js';
import * as r2Tier2 from './tier2/r2_buttons_boundaries.spec.js';
import * as r3Tier2 from './tier2/r3_list_density_boundaries.spec.js';
import * as r4Tier2 from './tier2/r4_filter_layout_boundaries.spec.js';

// Tier 3 Specs
import * as pairwiseTier3 from './tier3/pairwise_combinations.spec.js';

// Tier 4 Specs
import * as scenariosTier4 from './tier4/real_world_scenarios.spec.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: null,
    req: null,
    filter: null
  };

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      options.tier = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--req=')) {
      options.req = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1].toLowerCase();
    }
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const reporter = new TestReporter();
  reporter.printHeader();

  const runAllTiers = options.tier === null;

  try {
    // Pre-warm headless browser instance
    await getSharedPage();

    // TIER 1
    if (runAllTiers || options.tier === 1) {
      if (!options.req || options.req === 'R1') await r1Tier1.run(reporter);
      if (!options.req || options.req === 'R2') await r2Tier1.run(reporter);
      if (!options.req || options.req === 'R3') await r3Tier1.run(reporter);
      if (!options.req || options.req === 'R4') await r4Tier1.run(reporter);
    }

    // TIER 2
    if (runAllTiers || options.tier === 2) {
      if (!options.req || options.req === 'R1') await r1Tier2.run(reporter);
      if (!options.req || options.req === 'R2') await r2Tier2.run(reporter);
      if (!options.req || options.req === 'R3') await r3Tier2.run(reporter);
      if (!options.req || options.req === 'R4') await r4Tier2.run(reporter);
    }

    // TIER 3
    if (runAllTiers || options.tier === 3) {
      if (!options.req) await pairwiseTier3.run(reporter);
    }

    // TIER 4
    if (runAllTiers || options.tier === 4) {
      if (!options.req) await scenariosTier4.run(reporter);
    }
  } catch (err) {
    console.error('\nFatal error during test suite execution:', err);
  }

  const exitCode = reporter.printSummary();
  try {
    await closeBrowser();
  } catch {
    // ignore
  }
  await new Promise(r => setTimeout(r, 100));
  process.exit(exitCode);
}

main().catch(err => {
  console.error('Unhandled runner exception:', err);
  process.exit(1);
});
