# Root conftest. Its presence makes pytest prepend this directory to sys.path,
# which keeps imports working in normal runs now that django_find_project is
# disabled (see pyproject.toml — required for mutmut). It is also copied into
# mutmut's mutants/ sandbox so the same mechanism works there.
