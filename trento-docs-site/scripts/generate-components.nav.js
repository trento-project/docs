import path from 'path';
import { promises as fs } from 'fs';

const tmpComponentsDir = 'trento-docs-site/build/tmp_components';
const outputDir = 'trento-docs-site/build/gen_navigation';
const navigationFileName = 'nav_components.adoc';
const navFilePath = path.join(outputDir, navigationFileName);

async function generateComponentsNav() {
  try {
    await fs.mkdir(outputDir, { recursive: true });

    let navContent = '** Components\n\n';

    // Read all component directories
    const components = await fs.readdir(tmpComponentsDir, { withFileTypes: true });

    for (const component of components) {
      if (!component.isDirectory()) continue;

      const componentName = component.name;
      const componentPath = path.join(tmpComponentsDir, componentName);

      // --- Read README.adoc title ---
      const readmePath = path.join(componentPath, 'README.adoc');
      let title = componentName;
      try {
        const readmeContent = await fs.readFile(readmePath, 'utf8');
        const titleMatch = readmeContent.match(/^=\s*(.+)/m);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
        navContent += `*** xref:ROOT:${componentName}:README.adoc[${title}]\n`;
      } catch {
        // README.adoc missing → skip this component entirely
        continue;
      }

      // --- Scan docs/ and guides/ ---
      for (const docsDirName of ['docs', 'guides']) {
        const docsDirPath = path.join(componentPath, docsDirName);
        try {
          const docsEntries = await fs.readdir(docsDirPath, { withFileTypes: true });
          for (const entry of docsEntries) {
            if (entry.isFile() && entry.name.endsWith('.adoc')) {
              // Root-level doc
              const filePath = path.join(docsDirPath, entry.name);
              const content = await fs.readFile(filePath, 'utf8');
              const headerMatch = content.match(/^=\s*(.+)/m);
              const headerTitle = headerMatch ? headerMatch[1].trim() : entry.name.replace(/\.adoc$/, '');
              navContent += `**** xref:ROOT:${componentName}:${docsDirName}/${entry.name}[${headerTitle}]\n`;
            } else if (entry.isDirectory()) {
              // Subdirectory
              const subDirPath = path.join(docsDirPath, entry.name);
              navContent += `**** ${entry.name}\n`;
              const subEntries = await fs.readdir(subDirPath, { withFileTypes: true });
              for (const subFile of subEntries) {
                if (subFile.isFile() && subFile.name.endsWith('.adoc')) {
                  const subFilePath = path.join(subDirPath, subFile.name);
                  const content = await fs.readFile(subFilePath, 'utf8');
                  const headerMatch = content.match(/^=\s*(.+)/m);
                  const headerTitle = headerMatch ? headerMatch[1].trim() : subFile.name.replace(/\.adoc$/, '');
                  navContent += `***** xref:ROOT:${componentName}:${docsDirName}/${entry.name}/${subFile.name}[${headerTitle}]\n`;
                }
              }
            }
          }
        } catch {
          // No docs/guides dir → ignore
        }
      }

      navContent += '\n';
    }

    // --- Write nav file ---
    await fs.writeFile(navFilePath, navContent, 'utf8');

    console.log(`✅ Navigation file generated: ${navFilePath}`);
  } catch (err) {
    console.error('❌ Error generating navigation:', err);
  }
}

generateComponentsNav();