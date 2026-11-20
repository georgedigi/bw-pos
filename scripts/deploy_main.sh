#!/bin/bash
# Deploys origin/main of bw-pos to https://budgetwearpos.digerp.com, run FROM THIS PC (Linux / Git Bash).
#
#   bash <(git show origin/main:scripts/deploy_main.sh)    (from inside a bw-pos clone, any branch)
#   bash scripts/deploy_main.sh             check, build, upload, ask, switch, verify
#   bash scripts/deploy_main.sh --dry-run   check and build only (nothing on the server changes)
#   bash scripts/deploy_main.sh --status    what the server runs, what is waiting
#   bash scripts/deploy_main.sh --verify    only the after-deploy checks
#   bash scripts/deploy_main.sh --rollback  switch back to the release before the current one
#
#   --yes      don't ask before switching / rolling back
#   --force    deploy even when the server already runs origin/main
#
# How the server runs it (set up 2026-11-06):
#   budgetwearpos.digerp.com/.htaccess proxies to 127.0.0.1:3400 = PM2 process "bw-pos" (own PM2 home,
#   source ~/budgetwearpos/env.sh), Node 22 (/opt/alt/alt-nodejs22), cwd ~/budgetwearpos/app.
#   ~/budgetwearpos/app is a symlink to ~/budgetwearpos/releases/<release>/bw-pos.
#
# Steps:
#   1. git fetch; target = origin/main. Lists the commits the server does not have yet.
#   2. Builds that exact commit in a throwaway worktree (~/.cache/bw-pos-deploy), never from your
#      working copy, so a local .env (e.g. NEXT_PUBLIC_BACKEND_URL_OVERRIDE) never ends up in the build.
#      Package = .next/standalone + .next/static + public (Next's standalone layout).
#   3. Uploads it to ~/budgetwearpos/releases/<stamp>-<sha>/bw-pos (unpacked, checked) - the site is
#      still on the old release.
#   4. After you say yes: points the app symlink at the new release, restarts bw-pos, waits for
#      127.0.0.1:3400 to answer. If it does not, switches back to the old release and restarts.
#   5. Checks the public address and /version.json. Keeps the last 5 releases.
#
# Needs: the `digerp` entry in ~/.ssh/config (port 21098, user oytqnijs). Other host: BWP_SSH=<alias>.
# Local: git, node + npm (any recent version; the server runs Node 22).
set -uo pipefail

SSH_ALIAS=${BWP_SSH:-digerp}
SITE=${BWP_SITE:-https://budgetwearpos.digerp.com}
BRANCH=main
KEEP=5
DRY=0; YES=0; FORCE=0; MODE=deploy
while [ $# -gt 0 ]; do
	case "$1" in
		--dry-run) DRY=1 ;;
		--status) MODE=status ;;
		--verify) MODE=verify ;;
		--rollback) MODE=rollback ;;
		--yes|-y) YES=1 ;;
		--force) FORCE=1 ;;
		-h|--help) sed -n '2,/^set -uo/p' "${BASH_SOURCE[0]}" 2>/dev/null | sed '$d' || echo "see the top of scripts/deploy_main.sh"; exit 0 ;;
		*) echo "Unknown option $1 (see --help)"; exit 2 ;;
	esac
	shift
done

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
	R=$'\e[31m'; G=$'\e[32m'; Y=$'\e[33m'; C=$'\e[1;36m'; N=$'\e[0m'
else
	R=''; G=''; Y=''; C=''; N=''
fi
say()  { printf '%s\n' "$*"; }
step() { printf '\n%s== %s%s\n' "$C" "$*" "$N"; }
good() { printf '%s%s%s\n' "$G" "$*" "$N"; }
warn() { printf '%s%s%s\n' "$Y" "$*" "$N"; }
die()  { printf '%s!! %s%s\n' "$R" "$*" "$N" >&2; exit 1; }
ask()  { [ "$YES" = 1 ] && return 0; local a; read -r -p "$1 [y/N] " a < /dev/tty; [[ "$a" =~ ^[Yy] ]]; }

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || die "run this inside the bw-pos repo"
cd "$ROOT"
git remote get-url origin 2>/dev/null | grep -q 'bw-pos' || die "origin is not bw-pos ($(git remote get-url origin 2>/dev/null))"

remote() { ssh -o BatchMode=yes -o ServerAliveInterval=30 "$SSH_ALIAS" "$@" 2> >(grep -v -E 'post-quantum|store now|upgraded' >&2); }

# Runs on the server: the PM2 environment of this app
REMOTE_ENV='set -e; cd ~/budgetwearpos; . ./env.sh'

# release the server runs now: "<release dir name>" (e.g. 20261120-1530-ddf4beb)
server_release() { remote 'basename "$(dirname "$(readlink -f ~/budgetwearpos/app)")"'; }
# sha of a release: from its name, or the .sha file written at deploy (older releases have neither)
server_sha() { remote 'd=$(dirname "$(readlink -f ~/budgetwearpos/app)"); cat "$d/.sha" 2>/dev/null || true'; }

http_code() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$1"; }

verify() {
	step "Checks"
	local ok=1 c
	c=$(http_code "$SITE/"); [ "$c" = 200 ] && good "ok  $SITE/ -> 200" || { warn "$SITE/ -> $c"; ok=0; }
	c=$(http_code "$SITE/version.json"); [ "$c" = 200 ] && good "ok  /version.json -> 200 $(curl -s -m 10 "$SITE/version.json")" || { warn "/version.json -> $c"; ok=0; }
	remote "$REMOTE_ENV; pm2 jlist" | node -e '
		let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(a=>a.name==="bw-pos");
		if(!p){console.log("!! pm2: bw-pos not found");process.exit(1)}
		console.log((p.pm2_env.status==="online"?"ok  ":"!! ")+"pm2 bw-pos "+p.pm2_env.status+", restarts "+p.pm2_env.restart_time)})' || ok=0
	say "server runs: $(server_release)"
	[ "$ok" = 1 ] && good "All checks passed" || warn "Some checks need attention"
}

case "$MODE" in
status)
	git fetch -q origin || die "git fetch failed"
	say "origin/$BRANCH: $(git log -1 --format='%h %ci %an: %s' origin/$BRANCH)"
	say "server runs:   $(server_release) (sha: $(server_sha | cut -c1-12))"
	sha=$(server_sha)
	if [ -n "$sha" ] && git cat-file -e "$sha" 2>/dev/null; then
		say "waiting to deploy:"; git log --oneline "$sha..origin/$BRANCH" | sed 's/^/  /'
	else
		warn "(server release has no recorded commit - deployed by hand before this script)"
	fi
	remote 'ls -1 ~/budgetwearpos/releases | grep "^2"' | sed 's/^/  kept: /'
	exit 0 ;;
verify) verify; exit 0 ;;
rollback)
	step "Rollback"
	remote 'ls -1d ~/budgetwearpos/releases/2*/ | sed "s#/\$##" | xargs -n1 basename' | sed 's/^/  /'
	cur=$(server_release)
	prev=$(remote 'ls -1d ~/budgetwearpos/releases/2*/ | sed "s#/\$##" | xargs -n1 basename' | grep -B1 -x "$cur" | head -1)
	[ -n "$prev" ] && [ "$prev" != "$cur" ] || die "no release before $cur"
	say "current: $cur"; say "back to: $prev"
	ask "Switch to $prev?" || die "cancelled"
	remote "$REMOTE_ENV; ln -sfn releases/$prev/bw-pos app.new && mv -T app.new app && pm2 restart bw-pos --update-env >/dev/null && pm2 save >/dev/null && echo switched" || die "rollback failed"
	sleep 5; verify; exit 0 ;;
esac

# ---------------------------------------------------------------- deploy
step "1. What is waiting"
git fetch -q origin || die "git fetch failed"
SHA=$(git rev-parse "origin/$BRANCH") || die "no origin/$BRANCH"
SHORT=${SHA:0:7}
say "target: $(git log -1 --format='%h %ci %an: %s' "$SHA")"
CUR_SHA=$(server_sha)
say "server: $(server_release)"
if [ "$CUR_SHA" = "$SHA" ] && [ "$FORCE" = 0 ]; then good "Server already runs $SHORT (use --force to redeploy)"; exit 0; fi
if [ -n "$CUR_SHA" ] && git cat-file -e "$CUR_SHA" 2>/dev/null; then
	git log --oneline "$CUR_SHA..$SHA" | sed 's/^/  /'
else
	warn "(server release has no recorded commit - deployed by hand before this script)"
fi

step "2. Build $SHORT"
CACHE=${BWP_CACHE:-$HOME/.cache/bw-pos-deploy}
mkdir -p "$CACHE"
PKG="$CACHE/bw-pos-$SHORT.tar.gz"
if [ -s "$PKG" ] && [ "$FORCE" = 0 ]; then
	good "using cached build $PKG"
else
	WT="$CACHE/wt-$SHORT"
	git worktree remove --force "$WT" >/dev/null 2>&1; rm -rf "$WT"
	git worktree add -q --detach "$WT" "$SHA" || die "git worktree add failed"
	trap 'git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1' EXIT
	(
		cd "$WT" || exit 1
		unset NEXT_PUBLIC_BACKEND_URL_OVERRIDE
		export NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
		npm ci --include=dev --no-audit --no-fund --loglevel=error || exit 1
		npm run build || exit 1
	) || die "build failed"
	S="$WT/.next/standalone"
	[ -f "$S/server.js" ] || die "no .next/standalone/server.js (output: \"standalone\" missing?)"
	STAGE="$CACHE/stage-$SHORT"; rm -rf "$STAGE"; mkdir -p "$STAGE/bw-pos"
	cp -a "$S/." "$STAGE/bw-pos/"
	mkdir -p "$STAGE/bw-pos/.next"
	cp -a "$WT/.next/static" "$STAGE/bw-pos/.next/static"
	cp -a "$WT/public" "$STAGE/bw-pos/public"
	rm -f "$STAGE/bw-pos/.env"* 2>/dev/null
	echo "$SHA" > "$STAGE/.sha"
	tar -C "$STAGE" -czf "$PKG.tmp" bw-pos .sha && mv "$PKG.tmp" "$PKG" || die "packaging failed"
	rm -rf "$STAGE"
	good "built $(du -h "$PKG" | cut -f1) -> $PKG"
fi
# keep the last 3 builds locally
ls -1t "$CACHE"/bw-pos-*.tar.gz 2>/dev/null | tail -n +4 | xargs -r rm -f

if [ "$DRY" = 1 ]; then good "Dry run: nothing sent to the server."; exit 0; fi

step "3. Upload"
REL="$(date +%Y%m%d-%H%M)-$SHORT"
scp -q -o BatchMode=yes "$PKG" "$SSH_ALIAS:budgetwearpos/releases/$REL.tar.gz" 2> >(grep -v -E 'post-quantum|store now|upgraded' >&2) || die "upload failed"
remote "set -e; cd ~/budgetwearpos/releases; mkdir $REL; tar -C $REL -xzf $REL.tar.gz; rm -f $REL.tar.gz
	test -f $REL/bw-pos/server.js && test -d $REL/bw-pos/.next/static && test -f $REL/bw-pos/public/sw.js
	chmod -R u=rwX,go=rX $REL; du -sh $REL | cut -f1" || die "unpacking on the server failed (release $REL left in ~/budgetwearpos/releases)"
good "uploaded to ~/budgetwearpos/releases/$REL"

step "4. Switch"
OLD=$(server_release)
say "from $OLD to $REL"
if ! ask "Switch budgetwearpos.digerp.com to $REL now?"; then
	warn "Not switched. The release stays uploaded; run again (it reuses the build) or remove ~/budgetwearpos/releases/$REL."
	exit 1
fi
remote "$REMOTE_ENV
	ln -sfn releases/$REL/bw-pos app.new && mv -T app.new app
	pm2 restart bw-pos --update-env >/dev/null
	for i in \$(seq 1 30); do
		c=\$(curl -s -o /dev/null -m 5 -w '%{http_code}' http://127.0.0.1:3400/ || true)
		[ \"\$c\" = 200 ] && { pm2 save >/dev/null; echo \"ok  answers 200 after \${i}s\"; exit 0; }
		sleep 1
	done
	echo \"!! no 200 from 127.0.0.1:3400 (last: \$c) - switching back to $OLD\"
	ln -sfn releases/$OLD/bw-pos app.new && mv -T app.new app
	pm2 restart bw-pos --update-env >/dev/null
	exit 1" || die "new release did not start; back on $OLD. Log: ~/budgetwearpos/logs/app.log"

# keep the last $KEEP releases (never the one running)
remote "cd ~/budgetwearpos/releases; ls -1d 2*/ | sed 's#/\$##' | head -n -$KEEP | grep -vx '$REL' | xargs -r rm -rf; rm -f bw-pos-build.tar.gz.old 2>/dev/null; true"
sleep 2
verify
