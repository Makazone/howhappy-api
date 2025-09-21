import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import openApiDocument from '../src/docs/openapi.js';

const outputDir = resolve(process.cwd(), 'docs');
const outputPath = resolve(outputDir, 'openapi.json');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, JSON.stringify(openApiDocument, null, 2));

console.log(`OpenAPI specification written to ${outputPath}`);
