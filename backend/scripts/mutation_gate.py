"""Fail if the mutation score (killed / checked mutants) is below MIN_SCORE.

Run after `mutmut run`, e.g. via `make mutate`. Parses `mutmut results --all true`.
"""

import re
import subprocess
import sys

MIN_SCORE = 60.0

IGNORED_OUTCOMES = {"skipped", "not checked"}


def parse_results(output: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for line in output.splitlines():
        match = re.match(r"^\s*\S+: (.+)$", line)
        if match:
            outcome = match.group(1).strip()
            counts[outcome] = counts.get(outcome, 0) + 1
    return counts


def main() -> int:
    result = subprocess.run(
        ["mutmut", "results", "--all", "true"],
        capture_output=True,
        text=True,
        check=False,
    )
    counts = parse_results(result.stdout)
    checked = sum(n for outcome, n in counts.items() if outcome not in IGNORED_OUTCOMES)
    if checked == 0:
        print("mutation gate: no checked mutants found — did `mutmut run` succeed?")
        return 1
    killed = counts.get("killed", 0)
    score = 100.0 * killed / checked
    print(f"mutation gate: {killed}/{checked} mutants killed ({score:.1f}%), minimum {MIN_SCORE}%")
    for outcome, n in sorted(counts.items()):
        print(f"  {outcome}: {n}")
    if score < MIN_SCORE:
        print("mutation gate: FAILED")
        return 1
    print("mutation gate: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
