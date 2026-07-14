.PHONY: dev test lint typecheck complexity mutate check

dev:
	uv run python manage.py runserver

test:
	uv run pytest --cov=core --cov=oktclone --cov-report=term-missing

lint:
	uv run ruff check . && uv run ruff format --check .

typecheck:
	uv run mypy .

complexity:
	uv run xenon --max-absolute B --max-modules A --max-average A core oktclone

mutate:
	uv run mutmut run
	uv run python scripts/mutation_gate.py

check: lint typecheck complexity test
