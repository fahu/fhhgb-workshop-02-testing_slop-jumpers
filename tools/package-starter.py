"""Create slop-jumpers-testing.zip in the project folder. Run with Python 3."""

from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile


project = Path(__file__).resolve().parents[1]
destination = project / "slop-jumpers-testing.zip"
java_tests = Path("backend/src/test/java/at/fhhagenberg/slopjumpers")

# Only the workshop tests and their helpers belong in the student copy.
inputs = [
    ".gitignore", "README.md", "EXERCISES.md", "exercises", "mise.toml",
    "package.json", "tools/test-api.mjs",
    "shared",
    "backend/.mvn/wrapper/maven-wrapper.properties", "backend/mvnw",
    "backend/mvnw.cmd", "backend/pom.xml", "backend/src/main",
    java_tests / "CheckpointClientIT.java", java_tests / "HttpIntegrationTest.java", java_tests / "CheckpointWorkshopTest.java",
    "frontend/index.html", "frontend/package.json", "frontend/package-lock.json",
    "frontend/vitest.live.config.ts", "frontend/vitest.config.ts", "frontend/playwright.config.ts",
    "frontend/tsconfig.json", "frontend/vite.config.ts", "frontend/public",
    "frontend/src", "frontend/tests/support",
    "frontend/tests/unit/workshop", "frontend/tests/integration", "frontend/tests/e2e/workshop",
]

with TemporaryDirectory(dir=destination.parent) as directory:
    archive = Path(directory) / destination.name
    with ZipFile(archive, "w", compression=ZIP_DEFLATED) as starter:
        for entry in inputs:
            source = project / entry
            files = sorted(source.rglob("*")) if source.is_dir() else [source]
            for file in files:
                if file.is_dir() or file.name == ".DS_Store":
                    continue
                starter.write(file, Path("slop-jumpers") / file.relative_to(project))
    archive.replace(destination)

print(destination)
