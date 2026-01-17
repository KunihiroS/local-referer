# Local Referer

This plugin enhances the editing experience in Obsidian by allowing users to easily insert local files into their notes via the context menu.

## Features & Specification

1.  **Context Menu Integration**:
    *   Adds a "From Local" option to the editor context menu (right-click in Editor mode).

2.  **File Selection**:
    *   Clicking "From Local" opens the OS file explorer/dialog.
    *   The dialog opens at a user-configured directory (defaults to User's Home directory if not set).
    *   **Desktop Only**: This feature utilizes system dialogs and is available on Desktop versions only.

3.  **File Insertion**:
    *   The selected file is **copied** into the Obsidian Vault.
    *   **Destination Folder**: Respects the user's Obsidian setting for "Default location for new attachments".
    *   **Name Collision**: Handles duplicate filenames by auto-renaming (e.g. `image.png` -> `image 1.png`).
    *   An internal link (WikiLink format: `[[filename.ext]]`) is inserted at the cursor position.

## Development Setup

This project uses `pnpm` as the package manager.

```bash
# Install dependencies
pnpm install

# Build in development mode
pnpm run dev

# Build for production
pnpm run build
```


