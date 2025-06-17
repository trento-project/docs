# Trento docs

This repository is the source of truth for the Trento project documentation. 

- [User-facing documentation](./trento_suse/)
- [Trento components documentation](./components/)
- [Developer Documentation](./dev_docs/)
- [Templates](./templates)

The content is used to build both the official product documentation and the upstream development documentation.


## How to contribute to development documentation? 

  1. **Create new documentation in `.adoc`**.

  2. **Choose the appropriate location** for your new `.adoc` file:
   - For **user documentation**, place it under `trento_suse/adoc/`
   - For **developer docs**, use `dev_docs/`
   - For **component-specific docs**, use `components/<component-name>/`
   
  3. **Add new documentation to trento-docs site by enriching the Antora collector**
   
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

  6. Build Antora page

  ```bash
  npx antora --fetch antora-playbook.yml
  ```
  7. Run page

 ```bash
 xdg-open antora_public/index.html
 ```

