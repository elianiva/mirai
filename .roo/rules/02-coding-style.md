# Code Style

- Always use `function name(){}` instead of `const name = () => {}`
- Use this syntax whenever starting a new page / route
    ```tsx
    import { createFileRoute } from "@tanstack/react-router";

    export const Route = createFileRoute("/path")({
        component: XXXPage,
    });

    function XXXPage() {
        return (
            <div>
                Content
            </div>
        );
    }
    ```
- always use `type` over `interface`
- always break down to smaller components
- never exceed 500 lines of code for a single file
- always use kebab-case for file names, NEVER PascalCase or snakeCase
- always use camelCase for everything inside convex folders
- never destructure props
