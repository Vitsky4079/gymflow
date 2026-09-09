# GitHub readiness and future hosting

The repository is prepared locally. No remote repository, push or website deployment is performed by this setup.

## First publication

1. Review `git status` and the files to be shared. The delivery ZIP and local secrets are ignored; dist/ must be included.
2. Run `npm run check`, then make an initial commit when ready.
3. Create the desired GitHub repository with the owner's chosen visibility, connect its URL as origin, and push the reviewed branch.
4. The included CI workflow runs syntax checks on pushes and pull requests.

The application has no declared project license yet. The owner should choose licensing before public distribution; the Three.js license in dist/vendor/LICENSE applies to that vendor code and must be retained.

## Future static hosting

Publish only the contents of dist/ as the web root. No npm install, server deployment or build is needed. Keep vendor/ and the HTML import map intact. Relative asset paths support a repository subpath; verify the actual hosted URL before release.

For GitHub Pages, a future deployment workflow should upload dist/ and deploy through the repository's Pages environment after the owner selects the repository and enables Pages. No automatic publishing workflow is enabled now. Never upload the entire project root as the website.

The static site has no backend or cross-device synchronization. Saved browser plans remain tied to their original origin. Check module MIME types, vendor assets, WebGL rendering and the regression checklist after deployment. Google Fonts may require network access; system fonts are the fallback.
