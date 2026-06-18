# Analysis

Exploratory data analysis reports for the EPIC baseline dataset and ACS (Acute Chest Syndrome) cohort.

## Contents

| File | Description |
|------|-------------|
| `dataset-overview.qmd` | Quarto report: dataset inventory, completeness, visit patterns |
| `docs/` | Pre-rendered HTML outputs (aggregate charts only, no PHI) |

## Running Reports Locally

Reports require EPIC baseline exports on disk. They are **not** included in this repository.

```bash
# Set data path in the .qmd file or via environment
export DATA_DIR=/path/to/epic/exports
quarto render dataset-overview.qmd
```

## Portfolio Note

The HTML in `docs/` is included for demonstration of analytical outputs using de-identified aggregate statistics only.
