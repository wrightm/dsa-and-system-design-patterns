#!/usr/bin/env bash
# Scaffolds a new topic: package folder, article, notes and a test skeleton.
#
#   scripts/new-topic.sh <module> <slug> ["Title"]
#   scripts/new-topic.sh algorithms binary-search "Binary search"
set -euo pipefail

usage() {
    echo "usage: scripts/new-topic.sh <module> <slug> [\"Title\"]" >&2
    echo "modules: data-structures algorithms concurrency oo-design design-patterns" >&2
    echo "         enterprise-integration-patterns distributed-systems microservices-patterns" >&2
    echo "         system-design library-studies challenges" >&2
    exit 1
}

[ $# -ge 2 ] || usage
module="$1"
slug="$2"

case "$module" in
    data-structures) segment="ds" ;;
    algorithms) segment="algo" ;;
    concurrency) segment="concurrency" ;;
    oo-design) segment="ood" ;;
    design-patterns) segment="patterns" ;;
    enterprise-integration-patterns) segment="eip" ;;
    distributed-systems) segment="distributed" ;;
    microservices-patterns) segment="microservices" ;;
    system-design) segment="sysdesign" ;;
    library-studies) segment="libstudy" ;;
    challenges) segment="challenges" ;;
    *) echo "unknown module: $module" >&2; usage ;;
esac

if ! printf '%s' "$slug" | grep -Eq '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'; then
    echo "slug must be lower-case words joined by hyphens, e.g. binary-search" >&2
    exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
package_name="$(printf '%s' "$slug" | tr -d '-')"
class_name="$(printf '%s' "$slug" | awk -F- '{ for (i = 1; i <= NF; i++) printf "%s%s", toupper(substr($i, 1, 1)), substr($i, 2) }')"
default_title="$(printf '%s' "$slug" | tr '-' ' ' | awk '{ print toupper(substr($0, 1, 1)) substr($0, 2) }')"
title="${3:-$default_title}"

main_dir="$root/$module/src/main/java/learn/$segment/$package_name"
test_dir="$root/$module/src/test/java/learn/$segment/$package_name"

if [ -e "$main_dir" ]; then
    echo "already exists: ${main_dir#$root/}" >&2
    exit 1
fi

template="ARTICLE.md"
[ "$module" = "library-studies" ] && template="LIBRARY-STUDY.md"

mkdir -p "$main_dir" "$test_dir"

fill() {
    # Titles may contain characters that are special to sed, so substitute with awk.
    awk -v title="$title" '{ gsub(/\{\{TITLE\}\}/, title); print }' "$1"
}

fill "$root/templates/$template" > "$main_dir/README.md"
fill "$root/templates/NOTES.md" > "$main_dir/NOTES.md"

cat > "$main_dir/package-info.java" <<JAVA
/** $title. See README.md in this folder for the article. */
package learn.$segment.$package_name;
JAVA

cat > "$test_dir/${class_name}Test.java" <<JAVA
package learn.$segment.$package_name;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

class ${class_name}Test {

  @Test
  @Disabled("Replace with the first real test")
  void firstBehaviour() {}
}
JAVA

echo "Created:"
echo "  ${main_dir#$root/}/README.md   (article, status: draft)"
echo "  ${main_dir#$root/}/NOTES.md    (question log)"
echo "  ${test_dir#$root/}/${class_name}Test.java"
echo
echo "Next: move any questions for this topic out of docs/question-inbox.md,"
echo "then run ./gradlew :$module:test"
