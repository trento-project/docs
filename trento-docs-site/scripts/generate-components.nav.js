import path from 'path';
import { promises as fs } from 'fs';

const tmpComponentsDir = 'trento-docs-site/build/tmp_components';
const outputDir = 'trento-docs-site/build/gen_navigation';
const navigationFileName = 'nav_components.adoc';
const navFilePath = path.join(outputDir, navigationFileName);

// Utility: Extract first header without the "="
async function extractTitle(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const match = content.match(/^=\s*(.+)/m);
    return match ? match[1].trim() : path.basename(filePath, '.adoc');
  } catch {
    return path.basename(filePath, '.adoc');
  }
}

// Folders to ignore in navigation
const IGNORED_DIRS = /^(images?|examples)$/i;

async function generateComponentsNav() {
  try {
    await fs.mkdir(outputDir, { recursive: true });

    let navContent = '** Components\n\n';

    const components = (await fs.readdir(tmpComponentsDir, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort();

    for (const componentName of components) {
      const componentPath = path.join(tmpComponentsDir, componentName);

      // README.adoc
      const readmePath = path.join(componentPath, 'README.adoc');
      try {
        const title = await extractTitle(readmePath);
        navContent += `*** xref:ROOT:${componentName}:README.adoc[${title}]\n`;
      } catch {
        continue;
      }

      // docs/ and guides/
      for (const docsDirName of ['docs', 'guides']) {
        const docsDirPath = path.join(componentPath, docsDirName);
        try {
          const docsEntries = (await fs.readdir(docsDirPath, { withFileTypes: true }))
            .filter(entry => !(entry.isDirectory() && IGNORED_DIRS.test(entry.name))) // skip ignored dirs
            .sort((a, b) => a.name.localeCompare(b.name));

          for (const entry of docsEntries) {
            if (entry.isFile() && entry.name.endsWith('.adoc')) {
              const headerTitle = await extractTitle(path.join(docsDirPath, entry.name));
              navContent += `**** xref:ROOT:${componentName}:${entry.name}[${headerTitle}]\n`;
            } else if (entry.isDirectory()) {
              navContent += `**** ${entry.name}\n`;
              const subEntries = (await fs.readdir(path.join(docsDirPath, entry.name), { withFileTypes: true }))
                .filter(sub => !(sub.isDirectory() && IGNORED_DIRS.test(sub.name))) // skip ignored dirs inside subfolders too
                .sort((a, b) => a.name.localeCompare(b.name));

              for (const subFile of subEntries) {
                if (subFile.isFile() && subFile.name.endsWith('.adoc')) {
                  const headerTitle = await extractTitle(path.join(docsDirPath, entry.name, subFile.name));
                  navContent += `***** xref:ROOT:${componentName}:${entry.name}/${subFile.name}[${headerTitle}]\n`;
                }
              }
            }
          }
        } catch {
          // no docs/guides dir
        }
      }

      navContent += '\n';
    }

    await fs.writeFile(navFilePath, navContent, 'utf8');
    console.log(`✅ Navigation file generated: ${navFilePath}`);
  } catch (err) {
    console.error('❌ Error generating navigation:', err);
  }
}

generateComponentsNav();