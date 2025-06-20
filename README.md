# Trento docs

This repository is the source of truth for the Trento project documentation. 

- [Trento components documentation](./components/)
- [Developer Documentation](./developer/)
- [Templates](./templates)

> **Note:** The content of user facing documentation is fetched from https://github.com/SUSE/doc-unversioned/tree/main/trento

## How to contribute to development documentation? 

  1. **Create new documentation in `.adoc`**.

  2. **Choose the appropriate location** for your new `.adoc` file:
   - For **developer documentation**,like adr, rfc or architecture use `deveveloper/`.
   - For **component-specific docs**, like web, wanda or the agent, use `components/<component-name>/`.
   
  3. **Add new documentation to trento-docs site by enriching the Antora collector**
   The content of the modules directory is responsible for the build of the documentation page.
   
   Open the appropriate `nav.adoc` file under `modules/<module>/nav.adoc` and add a new entry for your page, for example:
   ```adoc
   * xref:my-new-page.adoc[My New Page]
   ```
   Make sure the file path is relative to modules/<module>/pages

  4. Install Dependency

  ```bash
  npm i -D -E antora
  ```

  5. Build Antora page

  ```bash
  npx antora --fetch antora-playbook.yml
  ```

  6. Run page

 ```bash
 xdg-open antora_public/index.html
 ```

