# Trento docs

This repository is the source of truth for the Trento project documentation. 
- [Trento user facing documentation](./trento/)
- [Trento components documentation](./components/)
- [Developer Documentation](./developer/)

## How to contribute to development documentation? 

  1. **Create new documentation in `.adoc`**.

  2. **Choose the appropriate location** for your new `.adoc` file:
   - For **user facing docs**, use `trento/adr/<article.adoc>`.
   - For **developer documentation**,like adr, rfc or architecture use `deveveloper/`.
   - For **component-specific docs**, like web, wanda or the agent, use `components/<component-name>/`.
   
  3. **Add new documentation to trento-docs site by enriching the Antora navigation**
   The content of the modules directory is responsible for building of the documentation page.
   
   Open the appropriate `nav.adoc` file under `modules/<module>/nav.adoc` and add a new entry for your page, for example:
   ```adoc
   * xref:my-new-page.adoc[My New Page]
   ```

  4. Install Dependency
  
  ```bash
  npm i -D -E antora
  ```

  5. Rebuild Ui Bundle inside `antora-ui-default`

  ```bash
    npx gulp bundle
  ```

  6. Build Antora page

  ```bash
  npx antora antora-playbook.yml
  ```

  7. Run page

  ```bash
  xdg-open antora_public/index.html
  ```

