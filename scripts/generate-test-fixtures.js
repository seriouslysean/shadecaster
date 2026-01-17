#!/usr/bin/env node

/**
 * Generate test fixtures for Cypress E2E tests
 *
 * This script creates simple PNG images for testing:
 * - test-circle.png: Black circle on transparent background
 * - test-white.png: All white image
 * - test-black.png: All black image
 * - test-star.png: Star shape on transparent background
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '..', 'cypress', 'fixtures');

/**
 * Create a simple PNG using base64 encoding
 * These are minimal 100x100 PNGs for testing purposes
 */

// 100x100 black circle on transparent background
// This is a valid test case for the shadow lamp generator
const testCircle = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAADjElEQVR4nO2d0W3bQBBE15USCVJCKZGS6pASHKcEB7LhSLZlU8fj7r4ZYPD5Q/yYvdtdkjc7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgKfj5eXl3cz+mNlfM/thZt/N7KuZfZn/NrOvZvbTzH6b2S8z+2xmH8zsw/Tr+/v3d3d3t/r1YRlXV1e3ZvaLpJh9J+mDpE+SPkr6JOlvv87V1dXq14wdXF9f35nZH5K+SfpO0jeSvpL0RdJnSZ9J+m+dzPX19erXjxNcXFy8MbO/JH0l6QtJnyV9IumzpE+SPpH0kaSPJH0g6YOk95LevXv37u3qHcAO7u/vb8zsr3U6NknfSPpK0leS/pD0maT/1knZrPP27u7uZvWO4AAXFxe30+l4T9I7Sf8kfZD0XtI7Se8lvZf0TtI7SW8lvSXpDUmvJb0i6eXqHcEOLi8vX5nZb5L+kfSepLeS3kh6TdJrkt6Q9JqkVyS9kvSKpJckvZT0gqTn83S8WL0j2MH19fWdpH8kvZH0iqSX86S8kPRc0nOSnpH0jKRnJD0j6SlJT0l6QtJjkh6t3hHs4Obm5rGZ/SXp6TwhT0l6QtJjkh6T9JikRyQ9IumhpIckPSDpPkmPVu8IdnB+fv7AzP5KekDSfZLuk/RQ0gOSHpB0n6T7JN0n6Z6ku5Lukv+26HIAACAASURBVHRH0m2SbpN0i6SbJN0g6TpJ10i6StIVki6TdImkiyRdIOk8SeecnZ39+6qrV3d7e3s7T8h5ks6RdJakMyRdIemypIskXSDpPEnnSDpL0hmSzpB0mqTTJJ0i6SRJx0k6JumopMMkHZJ0UNJBSQ9IOiDpgKT9kvZL2idpn6S9kvZK2iNpt6Tdkv4i6U+S/iDpd5J+J+k3kn4j6VeSfiXpF5J+JulnST+R9CNJP5L0I0k/kPQDSd+T9D1J35H0HUnfkvQtSd+Q9A1JX5P0NUlfkfQVSV+S9CVJX5D0BUmfk/Q5SZ+R9BlJn5L0KUmfkPQJSR+T9DFJH5P0EUkfkfQhSR+S9AFJH5D0Pknvk/QeSe+R9C5J75L0DknvkPQ2SW+T9BZJb5H0JklvkvQGSW+Q9DpJr5P0GkmvkfQqSa+S9ApJr5D0MkkvSXqZpJdIeomkF0l6kaQXSXqBpBdIep6k50l6jqTnSHqWpGdJeoakZ0h6mqSnSXqKpKdIepKkJ0l6gqQnSHqcpMdJeoySnJL85AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+D/5D4rDYOHSUz+rAAAAAElFTkSuQmCC';

// 100x100 all white image
const testWhite = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAASElEQVR4nO3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOB2AcYAAAGTvYp2AAAAAElFTkSuQmCC';

// 100x100 all black image
const testBlack = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAASUlEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC3AcUIAAFkqh/QAAAAAElFTkSuQmCC';

console.log('Generating test fixtures...');

try {
  // Write test fixtures as base64 encoded files
  writeFileSync(join(fixturesDir, 'test-circle.png'), testCircle, 'base64');
  console.log('✓ Created test-circle.png');

  writeFileSync(join(fixturesDir, 'test-white.png'), testWhite, 'base64');
  console.log('✓ Created test-white.png');

  writeFileSync(join(fixturesDir, 'test-black.png'), testBlack, 'base64');
  console.log('✓ Created test-black.png');

  // Star is the same as circle for now (can be enhanced later)
  writeFileSync(join(fixturesDir, 'test-star.png'), testCircle, 'base64');
  console.log('✓ Created test-star.png');

  console.log('\n✅ All test fixtures generated successfully!');
} catch (error) {
  console.error('❌ Error generating fixtures:', error);
  process.exit(1);
}
