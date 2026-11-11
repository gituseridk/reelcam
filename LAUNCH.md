# Launch checklist: reelcam

Run from the repository root, in this order. Nothing here has been run yet.

## 0. Before

- `npm run check` and `scripts/fresh-install.sh` are green on the commit being pushed.
- `gitleaks git .` reports no leaks over the whole history.
- The names are still free: `npm view reelcam` gives E404 and `gh repo view gituseridk/reelcam` is not found.

## 1. GitHub repository

```sh
gh repo create gituseridk/reelcam --public --source . --push \
  --description "Cinematic MP4 demo videos of any web app, from a short YAML script. CLI, GitHub Action and agent skill."
gh repo edit gituseridk/reelcam --homepage "https://www.npmjs.com/package/reelcam" \
  --add-topic demo-video --add-topic screencast --add-topic playwright --add-topic github-action \
  --add-topic cli --add-topic product-demo --add-topic video --add-topic agent-skill
```

Then wait for the first `ci` run (check, action, fresh-install) to pass: `gh run watch`.

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
git tag -f v0 v0.1.0          # the Action is used as gituseridk/reelcam@v0
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
