# hf-space-mirror-action

GitHub action to ease deployment of project to a Hugging Face Space.

## Usage

Add this action to your workflow file:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to HF Space
        uses: sondalex/hf-space-mirror-action
        with:
          directory: dist/
          repo_id: "username/repo"
          hf_token: ${{ secrets.HF_TOKEN }}
          exception_list: ".gitattributes,README.md"
```

## Inputs

- `repo_id`: The Hugging Face repository ID (e.g., `username/repo`). Required.
- `directory`: The local directory to upload to the Space. Required.
- `hf_token`: Hugging Face API token for authentication. Required.
- `exception_list`: Comma-separated list of files to exclude from deletion in the Space (e.g., `.gitattributes,README.md`). Optional, defaults to `.gitattributes`.

## Notes

- Ensure the `HF_TOKEN` is stored as a GitHub Secret.
- The action synchronizes the specified directory with the Hugging Face Space, uploading new or updated files and deleting files that no longer exist in the local directory, except those in the `exception_list`.
- By default, `.gitattributes` and `README.md ` are preserved to prevent accidental deletion of repository configuration files.
