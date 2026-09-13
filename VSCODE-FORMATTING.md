# VS Code formatting

Based on flipscout-phase5-walmart-zip-fix.zip, retaining the Walmart ZIP support, image fix and effect fix.

Formatted 144 source/configuration files with the installed VS Code extension’s Prettier 3.7.4: tabs, single quotes in JavaScript/TypeScript and JSX, print width 120, and bracketSameLine enabled. Other Prettier defaults remain unchanged. JSON keeps its required double quotes; YAML uses valid space indentation.

The project includes .prettierrc.json, .prettierignore, and .vscode/settings.json. Open the extracted flipscout folder in VS Code and use the Prettier extension; saving supported files applies this style. Only formatting preferences are included, not personal editor, SSH or database settings.

SQL, Markdown documentation, env files, validation evidence and dependency lockfiles were not reformatted. Dependencies and application behavior were not intentionally changed. No database migration or environment changes are required.

Validation: Prettier check passed; 44 existing tests passed; API typecheck and production web build passed.
