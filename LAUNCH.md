# Launch checklist: reelcam

Run from the repository root, in this order. State on 2026-11-24: the repository is **public**
(gituseridk/reelcam), v0.1.0 is tagged and released on GitHub, CI on main is green, the README
hero plays inline (`docs/hero.gif`); nothing is on npm yet and nothing has been announced.
Steps 1 to 3 are done; step 4 (npm) and the launch posts wait on the owner.

## 0. Before

- `npm run check` and `scripts/fresh-install.sh` are green on the commit being pushed.
- `gitleaks git .` reports no leaks over the whole history.
- The npm name is still free: `npm view reelcam` gives E404.
- `git status` is clean and `git push origin main` is done, so the public repo shows the commit
  that was checked.

## 1. Make the repository public

The repository already exists, private, with its description. Making it public is the owner's
decision and cannot be quietly undone (stars, forks and clones stay out there).

```sh
gh repo edit gituseridk/reelcam --visibility public --accept-visibility-change-consequences
gh repo edit gituseridk/reelcam --homepage "https://www.npmjs.com/package/reelcam" \
  --add-topic demo-video --add-topic screencast --add-topic playwright --add-topic github-action \
  --add-topic cli --add-topic product-demo --add-topic video --add-topic agent-skill
```

Then check that the latest `ci` run (check, action, fresh-install) on main passed: `gh run list --limit 3`.

## 2. Hero video in the README

Done in the repository: `scripts/hero.sh` renders `docs/hero.mp4` and the inline
`docs/hero.gif` (960 px, 20 fps), and the README shows the GIF linked to the MP4. No manual
upload is needed.

## 3. First release

```sh
git tag -a v0.1.0 -m "reelcam 0.1.0"
git tag -f v0 v0.1.0          # the README's Action example (gituseridk/reelcam@v0) works from here on
git push origin v0.1.0 v0
gh release create v0.1.0 --title "reelcam 0.1.0" --generate-notes
```

## 4. npm

This PC has no npm login (`npm whoami` gives ENEEDAUTH), so the owner signs in once.

```sh
npm login                      # owner, once, in the browser
npm whoami
npm publish --access public    # prepack builds dist/
npm view reelcam version       # 0.1.0
```

`--provenance` works only from CI. For later releases: add the repository as a trusted
publisher on npmjs.com (package settings), then publish from a workflow with `id-token: write`.
