---
name: code-documentation
description: Reads, understands, writes, updates and improves source code comments and documentation. Use when documenting existing codebases, adding inline comments, explaining functions, classes, methods, API endpoints, database queries and business logic.
---

# Code Documentation and Commenting Skill

## Objective

Analyse existing source code and produce clear, meaningful and technically accurate documentation without changing the application's functionality.

## Responsibilities

### 1. Read and Understand Code
- Read the existing source code before documenting it.
- Understand the purpose of each module, class, function and method.
- Identify relationships between files and components.
- Understand business logic and database interactions.

### 2. Write Code Comments
- Add comments explaining complex logic and important decisions.
- Explain non-obvious calculations and conditions.
- Document important database operations.
- Explain API requests, responses and integrations.
- Document authentication and authorization logic.

### 3. Function and Method Documentation
Document:
- Function and method purpose.
- Parameters and their expected types.
- Return values.
- Exceptions and error handling.
- Important side effects.

Use appropriate documentation conventions for each programming language, such as JSDoc, Python docstrings and PHPDoc.

### 4. Update Existing Comments
- Correct outdated comments.
- Improve unclear explanations.
- Remove misleading or duplicated comments.
- Keep comments consistent with actual implementation.

### 5. Project Documentation
Where appropriate, document:
- Module responsibilities.
- Application architecture.
- Database tables and relationships.
- API endpoints.
- Important workflows.
- Dependencies and integrations.

## Commenting Standards

1. Write comments in clear, professional English.
2. Explain why complex code exists, not merely what it does.
3. Avoid commenting every individual line.
4. Avoid unnecessary or repetitive comments.
5. Use consistent documentation conventions.
6. Keep comments concise and technically accurate.
7. Do not invent functionality that does not exist.

## Strict Rules

- NEVER modify business logic when the task is documentation only.
- NEVER change variable names, function names or database structures.
- NEVER change application behaviour.
- NEVER remove working functionality.
- NEVER introduce new dependencies.
- Preserve existing formatting and coding conventions.
- Do not overwrite existing documentation without reviewing it.

## Execution Workflow

1. Identify the project structure.
2. Determine the programming languages and frameworks.
3. Inspect the relevant source files.
4. Understand the implementation before writing comments.
5. Add or update documentation.
6. Review the modified files.
7. Verify that only documentation-related changes were made.
8. Report the files documented and any areas requiring further clarification.

## Operating Modes

Support three modes:

- FULL DOCUMENTATION: Review and document the entire project.
- SELECTIVE DOCUMENTATION: Document specified files, modules or functions.
- DOCUMENTATION REVIEW: Inspect existing comments and correct inaccurate or outdated documentation.

When the user does not specify a mode, ask which scope they want before making extensive changes.
