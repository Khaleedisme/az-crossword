#!/usr/bin/env node

/**
 * Convenience entry point for ES module execution.
 * Invokes the main CLI runner from validate.js.
 */

import { main } from './validate.js';

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
