#!/usr/bin/env bash
# Download ~200px university logos from Wikimedia Commons
# All URLs verified to return image/png (HTTP 200) before inclusion.
# Run from anywhere — script self-locates its own directory.
#
# NOTE: Wikimedia's CDN blocks curl's default User-Agent, so we pass -A.

set -euo pipefail
OUTPUT_DIR="$(cd "$(dirname "$0")" && pwd)"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

dl() {
  local name="$1" url="$2"
  curl -sL -A "$UA" -o "$OUTPUT_DIR/$name" "$url"
  echo "  $name: $(wc -c < "$OUTPUT_DIR/$name" | tr -d ' ') bytes"
}

echo "Downloading university logos to $OUTPUT_DIR ..."

# 1. UCI — UC Irvine (wordmark)
dl uci.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/University_of_California%2C_Irvine_logo.svg/200px-University_of_California%2C_Irvine_logo.svg.png"

# 2. UCSD — UC San Diego (wordmark)
dl ucsd.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/University_of_California%2C_San_Diego_logo.svg/200px-University_of_California%2C_San_Diego_logo.svg.png"

# 3. UCSB — UC Santa Barbara (wordmark)
dl ucsb.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/University_of_California%2C_Santa_Barbara_logo.svg/200px-University_of_California%2C_Santa_Barbara_logo.svg.png"

# 4. UCD — UC Davis (seal, ~45 KB)
dl ucd.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/The_University_of_California_Davis.svg/200px-The_University_of_California_Davis.svg.png"

# 5. UCSC — UC Santa Cruz (wordmark)
dl ucsc.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/UC_Santa_Cruz_logo.svg/200px-UC_Santa_Cruz_logo.svg.png"

# 6. UCR — UC Riverside (wordmark)
dl ucr.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/UC_Riverside_logo.svg/200px-UC_Riverside_logo.svg.png"

# 7. UCM — UC Merced (logo PNG, ~30 KB)
dl ucm.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Uc_merced_logo.png/200px-Uc_merced_logo.png"

# 8. CSUF — Cal State Fullerton (wordmark)
dl csuf.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/California_State_University%2C_Fullerton_logo.svg/200px-California_State_University%2C_Fullerton_logo.svg.png"

# 9. CSULB — Cal State Long Beach (seal, ~32 KB) [wikipedia/en]
dl csulb.png \
  "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/CSU-Longbeach_seal.svg/200px-CSU-Longbeach_seal.svg.png"

# 10. CPSLO — Cal Poly SLO (logo)
dl cpslo.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Cal_Poly_Logo_2019.svg/200px-Cal_Poly_Logo_2019.svg.png"

# 11. SDSU — San Diego State (seal, ~37 KB) [wikipedia/en]
dl sdsu.png \
  "https://upload.wikimedia.org/wikipedia/en/thumb/6/60/San_Diego_State_University_seal.svg/200px-San_Diego_State_University_seal.svg.png"

# 12. CPP — Cal Poly Pomona (logo PNG)
dl cpp.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Calpoly_pomona_univ_logo.png/200px-Calpoly_pomona_univ_logo.png"

# 13. SJSU — San Jose State (wordmark)
dl sjsu.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/San_Jose_State_University_logo.svg/200px-San_Jose_State_University_logo.svg.png"

# 14. USC — University of Southern California (seal, ~47 KB)
dl usc.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/University_of_Southern_California_%28USC%29_seal.svg/200px-University_of_Southern_California_%28USC%29_seal.svg.png"

# 15. LMU — Loyola Marymount University (logo PNG) [wikipedia/en]
dl lmu.png \
  "https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Loyola_Marymount_University_logo.png/200px-Loyola_Marymount_University_logo.png"

# 16. OC — Occidental College (logo)
dl oc.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Occidental_College_logo.svg/200px-Occidental_College_logo.svg.png"

# 17. Chapman — Chapman University (wordmark)
dl chapman.png \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Chapman_University_logo.svg/200px-Chapman_University_logo.svg.png"

echo "Done."
echo ""
echo "Verifying all files are real PNGs:"
for f in uci ucsd ucsb ucd ucsc ucr ucm csuf csulb cpslo sdsu cpp sjsu usc lmu oc chapman; do
  type=$(file "$OUTPUT_DIR/$f.png" | grep -o "PNG image data" || echo "NOT A PNG")
  echo "  $f.png: $type"
done
