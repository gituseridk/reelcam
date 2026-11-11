# Launch checklist: reelcam

Run from the repository root, in this order. State on 2026-11-11: the repository exists and is
**private** (gituseridk/reelcam, `origin`, description set); no topics, no homepage, no tags, no
release, nothing on npm. Steps 1 (make public) to 4 have not been run.

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

GitHub plays inline only videos uploaded as user attachments; a repository MP4 is only a link.

1. On github.com, open any issue or comment box in gituseridk/reelcam, drag in `docs/hero.mp4`
   and copy the `https://github.com/user-attachments/assets/<id>` URL it gives (do not submit
   the comment).
2. In README.md, replace the hero line
   `[![The hero video, made by Reelcam](docs/hero.png)](docs/hero.mp4)`
   with that URL on its own line. Keep `docs/hero.png` as the npm page poster if wanted.
3. Commit and push.

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
