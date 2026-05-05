#!/bin/sh
# Sets LD_LIBRARY_PATH from the Nix store so the Playwright chromium binary
# can find system libraries (glib, dbus, X11, atk, etc.) at load time.
# The glibc entry MUST come first to avoid GLIBC_PRIVATE version mismatches.
set -e

NIX_GLIBC="/nix/store/9bh3986bpragfjmr32gay8p95k91q4gy-glibc-2.33-47/lib"
GLIB_EXTRA="/nix/store/3jz43ya7j65mh53nj262rilsk1j2jb68-glib-2.68.3/lib:/nix/store/z2pn444bdd6h77k3mx7yw7wnzarw8kb1-glib-2.68.3/lib"

# Dynamic: pick up all user-installed nix packages
NIX_PKG_LIBS=""
if command -v nix-env >/dev/null 2>&1; then
  NIX_PKG_LIBS=$(nix-env -q --out-path 2>/dev/null \
    | awk '{gsub(/out=/, "", $2); if ($2 ~ /^\/nix\/store/) print $2"/lib"}' \
    | tr '\n' ':')
fi

export LD_LIBRARY_PATH="${NIX_GLIBC}:${GLIB_EXTRA}:${NIX_PKG_LIBS}${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"

exec "$@"
