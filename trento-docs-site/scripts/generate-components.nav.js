import path from "path";
import { promises as fs } from "fs";
const CONFIG = {
  tmpComponentsDir: "trento-docs-site/build/tmp_components",
  outputDir: "trento-docs-site/build/gen_navigation",
  navigationFileName: "nav_components.adoc", // embedded in trento-docs-site/modules/developer/nav_developer.adoc
  encoding: "utf8",
  docsFileFormat: ".adoc",
  navFileTitle: "** Components\n\n",
  docsDirNames: ["docs", "guides"], // Source directories to scan for documentation in upstream project repo
  ignoredDirs: ["image", "images", "examples"], // Directories to exclude when scanning docsDirNames
  readmeFileName: "README.adoc",
  docsLevel: "****", // Navigation level for docs directory entries (web/docs/article.adoc)
  readmeLevel: "***", // Navigation level for README files for the upstream project (web/README.adoc, wanda/README.adoc)
  lineEnding: "\n", // Line ending for generated content
  xrefModule: "ROOT", // Antora module for xref links
};
const REGEX = {
  contentTitle: /^=\s*(.+)/m, // Matches AsciiDoc title (= Title) and captures the title text
};
const getNavFilePath = (config) =>
  path.join(config.outputDir, config.navigationFileName);
const isIgnoredDir = (ignoredDirs) => (name) =>
  ignoredDirs.includes(name.toLowerCase());
const getFilenameWithoutExtension = (fileFormat) => (filePath) =>
  path.basename(filePath, fileFormat);
const isAdocFile = (fileFormat) => (fileName) => fileName.endsWith(fileFormat);
const createErrorMessage = (filePath) => `⚠️ Could not read file ${filePath}:`;

// Read AsciiDoc file, extracts its title from the = Title header, and returns either that title or the filename as a fallback
const extractTitle = async (filePath, config) => {
  const fallbackTitle = getFilenameWithoutExtension(config.docsFileFormat)(
    filePath,
  );

  try {
    const content = await fs.readFile(filePath, config.encoding);
    const match = content.match(REGEX.contentTitle);

    if (match?.[1]) {
      const title = match[1].trim();
      return title || fallbackTitle;
    }

    return fallbackTitle;
  } catch (error) {
    console.warn(createErrorMessage(filePath), error.message);
    return fallbackTitle;
  }
};
// Creates clickable navigation links in the generated navigation file.
// createXref("trento-agent", "installation.adoc", "Installation Guide") --> xref:ROOT:trento-agent:installation.adoc[Installation Guide]
// xref:ROOT:trento-agent:installation.adoc[Installation Guide] --> xref:ROOT:trento-agent:installation.adoc[Installation Guide]
const createXref = (componentName, filePath, title, config) => {
  return `xref:${config.xrefModule}:${componentName}:${filePath}[${title}]`;
};

const getNextLevel = (currentLevel) => "*".repeat(currentLevel.length + 1);

// For README files at component root level
const generateReadmeNavEntry = async (filePath, componentName, config) => {
  const { lineEnding, readmeLevel, readmeFileName } = config;
  const title = await extractTitle(filePath, config);
  return `${readmeLevel} ${createXref(componentName, readmeFileName, title, config)}${lineEnding}`;
};

// For docs/guides files
const generateDocsNavEntry = async (
  filePath,
  componentName,
  relativePath,
  config,
) => {
  const { lineEnding, docsLevel } = config;
  const title = await extractTitle(filePath, config);
  const xrefPath = relativePath ?? path.basename(filePath);
  return `${docsLevel} ${createXref(componentName, xrefPath, title, config)}${lineEnding}`;
};

// For docs/guides files with custom level (for nested content)
const generateNestedDocsNavEntry = async (
  filePath,
  componentName,
  relativePath,
  parentLevel,
  config,
) => {
  const { lineEnding } = config;
  const level = getNextLevel(parentLevel);
  const title = await extractTitle(filePath, config);
  const xrefPath = relativePath ?? path.basename(filePath);
  return `${level} ${createXref(componentName, xrefPath, title, config)}${lineEnding}`;
};

// For directory entries (when needed)
const generateDirNavEntry = (
  componentName,
  relativePath,
  dirName,
  level,
  config,
) => {
  const { lineEnding } = config;
  return `${level} ${createXref(componentName, relativePath, dirName, config)}${lineEnding}`;
};

// Determines if a directory entry should be included in navigation (excludes ignored directories but keeps all files)
const shouldIncludeEntry = (entry, ignoredDirs) => {
  return !(entry.isDirectory() && isIgnoredDir(ignoredDirs)(entry.name));
};

// Reads directory content, filters out ignored directories, and returns sorted entries (files + non-ignored directories)
const getFilteredDirectoryContent = async (dirPath, config) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => shouldIncludeEntry(entry, config.ignoredDirs))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return [];
  }
};

const isReadmeFile = (entry, config) => {
  return entry.isFile() && entry.name === config.readmeFileName;
};

const isProcessableAdocFile = (entry, config) => {
  return entry.isFile() && isAdocFile(config.docsFileFormat)(entry.name);
};

const generateNavContentFromDocsDir = async (
  entries,
  dirPath,
  componentName,
  parentPath,
  level,
  config,
) => {
  let content = "";

  for (const entry of entries) {
    // Checks if a directory entry is a README file that should must be skipped in docs/guides
    if (isReadmeFile(entry, config)) {
      continue;
    }

    if (isProcessableAdocFile(entry, config)) {
      const filePath = path.join(dirPath, entry.name);
      const relativePath = parentPath
        ? `${parentPath}/${entry.name}`
        : entry.name;
      content += await generateNestedDocsNavEntry(
        filePath,
        componentName,
        relativePath,
        level,
        config,
      );
    }
  }
  return content;
};

const processDirectory = async (
  dirPath,
  componentName,
  parentPath,
  level,
  config,
) => {
  const { readmeFileName, lineEnding } = config;
  const dirName = path.basename(dirPath);
  const readmePath = path.join(dirPath, readmeFileName);

  let content = "";
  // Check if directory contains README.adoc
  try {
    await fs.access(readmePath);
    // Directory has README, create xref link with directory name as title
    const relativePath = parentPath
      ? `${parentPath}/${readmeFileName}`
      : `${dirName}/${readmeFileName}`;
    content = generateDirNavEntry(
      componentName,
      relativePath,
      dirName,
      level,
      config,
    );
  } catch (error) {
    // No README found, use directory name
    content = `${level} ${dirName}${lineEnding}`;
  }

  const entries = await getFilteredDirectoryContent(dirPath, config);
  if (entries.length > 0) {
    content += await generateNavContentFromDocsDir(
      entries,
      dirPath,
      componentName,
      parentPath,
      level,
      config,
    );
  }
  return content;
};

const processDocsDirectory = async (
  componentPath,
  componentName,
  docsDirName,
  config,
) => {
  const docsDirPath = path.join(componentPath, docsDirName);
  const docsEntries = await getFilteredDirectoryContent(docsDirPath, config);

  if (docsEntries.length === 0) {
    return "";
  }
  let content = "";
  for (const entry of docsEntries) {
    const entryPath = path.join(docsDirPath, entry.name);

    if (entry.isFile() && entry.name === config.readmeFileName) {
      // Skip README files as they're handled in processDirectory
      continue;
    }
    if (entry.isFile() && isAdocFile(config.docsFileFormat)(entry.name)) {
      content += await generateDocsNavEntry(
        entryPath,
        componentName,
        entry.name,
        config,
      );
    } else if (entry.isDirectory()) {
      content += await processDirectory(
        entryPath,
        componentName,
        entry.name,
        config.docsLevel,
        config,
      );
    }
  }
  return content;
};

const processReadme = async (componentPath, componentName, config) => {
  const readmePath = path.join(componentPath, config.readmeFileName);
  try {
    return await generateReadmeNavEntry(readmePath, componentName, config);
  } catch (error) {
    return "";
  }
};

const processDocsDirectories = async (componentPath, componentName, config) => {
  let content = "";
  for (const docsDirName of config.docsDirNames) {
    content += await processDocsDirectory(
      componentPath,
      componentName,
      docsDirName,
      config,
    );
  }
  return content;
};

const processComponent = async (componentName, config) => {
  const componentPath = path.join(config.tmpComponentsDir, componentName);
  const readmeContent = await processReadme(
    componentPath,
    componentName,
    config,
  );
  if (!readmeContent) {
    return ""; // Skip components without README
  }
  const docsContent = await processDocsDirectories(
    componentPath,
    componentName,
    config,
  );
  return readmeContent + docsContent + config.lineEnding;
};

const getComponents = async (config) => {
  try {
    const entries = await fs.readdir(config.tmpComponentsDir, {
      withFileTypes: true,
    });
    return entries
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .sort();
  } catch (error) {
    throw new Error(`Could not read components directory: ${error.message}`);
  }
};

const processAllComponents = async (components, config) => {
  let navContent = config.navFileTitle;
  for (const componentName of components) {
    const componentContent = await processComponent(componentName, config);
    if (componentContent.trim()) {
      // skip empty components
      navContent += componentContent;
    }
  }
  return navContent.trimEnd() + config.lineEnding;
};

const writeNavigationFile = async (navContent, config) => {
  const navFilePath = getNavFilePath(config);
  await fs.writeFile(navFilePath, navContent, config.encoding);
  return navFilePath;
};

const printGenerationResult = (navContent, navFilePath, components, config) => {
  const consoleOutput = [
    `📊 Processed ${components.length} upstream Components: ${components.join(", ")}`,
    "============================================================",
    "📄 GENERATED NAVIGATION CONTENT FOR COMPONENTS Section",
    "============================================================",
    navContent,
    "============================================================",
    `✅ Navigation file generated: ${navFilePath}`,
  ].join(config.lineEnding);
  console.log(consoleOutput);
};

const generateComponentsNav = async (config = CONFIG) => {
  try {
    // Ensure output directory exists
    await fs.mkdir(config.outputDir, { recursive: true });
    // Get all components
    const components = await getComponents(config);
    // Process all components
    const navContent = await processAllComponents(components, config);
    // Write navigation file
    const navFilePath = await writeNavigationFile(navContent, config);
    // console log build process and generated navigation file
    printGenerationResult(navContent, navFilePath, components, config);
  } catch (error) {
    console.error("❌ Error generating navigation:", error);
    process.exit(1);
  }
};

generateComponentsNav(CONFIG);
