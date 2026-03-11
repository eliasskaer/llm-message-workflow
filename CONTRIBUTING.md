# Contributing to LLM Message Workflow System

Thank you for your interest in contributing to this project! 🎉

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Your environment (OS, Node.js version)
- Any relevant error messages or logs

### Suggesting Enhancements

For feature requests or enhancements:
- Open an issue describing the enhancement
- Explain why this enhancement would be useful
- Provide examples of how it would work

### Pull Requests

1. **Fork the repository** and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Write clear, commented code
   - Follow the existing code style
   - Update documentation if needed

3. **Test your changes**:
   - Ensure the application still runs: `npm start`
   - Test all affected functionality
   - Verify no console errors

4. **Commit your changes**:
   ```bash
   git commit -m "Add: Brief description of your changes"
   ```
   Use prefixes like:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for improvements
   - `Docs:` for documentation changes

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**:
   - Provide a clear description of the changes
   - Reference any related issues
   - Explain why the change is needed

## Development Guidelines

### Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Keep functions focused and modular
- Follow existing patterns in the codebase

### Project Structure

- `src/` - Core application logic
- `public/` - Web dashboard files
- `prompts/` - LLM prompt templates
- `data/` - Input data files
- `output/` - Generated output files

### Modifying Prompts

When updating LLM prompts in `prompts/`:
- Test thoroughly with various inputs
- Document expected behavior changes
- Consider edge cases

### Adding New Features

For significant features:
- Discuss the approach in an issue first
- Keep backward compatibility when possible
- Update relevant documentation files
- Add examples if applicable

## Questions?

Feel free to open an issue for any questions about contributing!

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the project and community

Thank you for contributing! 🚀
