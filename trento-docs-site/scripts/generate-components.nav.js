import path from 'path';
import { promises as fs } from 'fs';
import { componentsContent } from './components_content.js';

const outputDir = 'trento-docs-site/build/gen_navigation';
const navigationFileName = 'nav_components.adoc';
const navFilePath = path.join(outputDir, navigationFileName);

async function generateComponentsNav() {
  try {
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(navFilePath, componentsContent, 'utf8');

    console.log(`File created successfully at: ${navFilePath}`);
  } catch (err) {
    console.error('Error writing files:', err);
  }
}

generateComponentsNav();