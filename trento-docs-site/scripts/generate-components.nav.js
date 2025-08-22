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

const createXref = (componentName, filePath, title) => {
  return `xref:ROOT:${componentName}:${filePath}[${title}]`;
};

const processAdocFile = async (
  filePath,
  componentName,
  relativePath,
  level,
  config,
) => {
  const title = await extractTitle(filePath, config);
  const xrefPath = relativePath || path.basename(filePath);
  return `${level} ${createXref(componentName, xrefPath, title)}\n`;
};

const readDirectoryEntries = async (dirPath, config) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          !(
            entry.isDirectory() && isIgnoredDir(config.ignoredDirs)(entry.name)
          ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return [];
  }
};

const processDirectoryEntries = async (
  entries,
  dirPath,
  componentName,
  parentPath,
  level,
  config,
) => {
  let content = "";
  const nextLevel = "*".repeat(level.length + 1);

  for (const entry of entries) {
    if (entry.isFile() && entry.name === config.readmeFileName) {
      // Skip README files as they're handled in processDirectory
      continue;
    }
    if (entry.isFile() && isAdocFile(config.docsFileFormat)(entry.name)) {
      const filePath = path.join(dirPath, entry.name);
      const relativePath = parentPath
        ? `${parentPath}/${entry.name}`
        : entry.name;
      content += await processAdocFile(
        filePath,
        componentName,
        relativePath,
        nextLevel,
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
  const dirName = path.basename(dirPath);
  const readmePath = path.join(dirPath, config.readmeFileName);

  let content = "";
  // Check if directory contains README.adoc
  try {
    await fs.access(readmePath);
    // Directory has README, create xref link with directory name as title
    const relativePath = parentPath
      ? `${parentPath}/${config.readmeFileName}`
      : `${dirName}/${config.readmeFileName}`;
    content = `${level} ${createXref(componentName, relativePath, dirName)}\n`;
  } catch (error) {
    // No README found, use directory name
    content = `${level} ${dirName}\n`;
  }

  const entries = await readDirectoryEntries(dirPath, config);
  if (entries.length > 0) {
    content += await processDirectoryEntries(
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
  const docsEntries = await readDirectoryEntries(docsDirPath, config);

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
      content += await processAdocFile(
        entryPath,
        componentName,
        entry.name,
        "****",
        config,
      );
    } else if (entry.isDirectory()) {
      content += await processDirectory(
        entryPath,
        componentName,
        entry.name,
        "****",
        config,
      );
    }
  }
  return content;
};

const processReadme = async (componentPath, componentName, config) => {
  const readmePath = path.join(componentPath, config.readmeFileName);
  try {
    const title = await extractTitle(readmePath, config);
    return `*** ${createXref(componentName, config.readmeFileName, title)}\n`;
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
  return readmeContent + docsContent + "\n";
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
  return navContent.trimEnd() + "\n";
};

const writeNavigationFile = async (navContent, config) => {
  const navFilePath = getNavFilePath(config);
  await fs.writeFile(navFilePath, navContent, config.encoding);
  return navFilePath;
};

const printGenerationResult = (navContent, navFilePath, components) => {
  const consoleOutput = [
    `📊 Processed ${components.length} upstream Components: ${components.join(", ")}`,
    "============================================================",
    "📄 GENERATED NAVIGATION CONTENT FOR COMPONENTS Section",
    "============================================================",
    navContent,
    "============================================================",
    `✅ Navigation file generated: ${navFilePath}`,
  ].join("\n");
  console.log(consoleOutput);
};

const generateComponentsNav = async () => {
  try {
    // Ensure output directory exists
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
    // Get all components
    const components = await getComponents(CONFIG);
    // Process all components
    const navContent = await processAllComponents(components, CONFIG);
    // Write navigation file
    const navFilePath = await writeNavigationFile(navContent, CONFIG);
    // console log build process
    printGenerationResult(navContent, navFilePath, components);
  } catch (error) {
    console.error("❌ Error generating navigation:", error);
    process.exit(1);
  }
};

generateComponentsNav();
