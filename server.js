// server.js - V2.2 (Fixed)

// 1. Import Modules
const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked'); // For rendering Markdown

// 2. Initialize App and Configuration
const app = express();
const PORT = process.env.PORT || 3000;
const projectsDirectory = path.join(__dirname, 'projects');

// 3. Set up Middleware
// Serve the main UI (our new single-page app in the 'public' folder)
app.use(express.static(path.join(__dirname, 'public')));
// Serve the actual project files (index.html, etc.) from the 'projects' folder
app.use(express.static(projectsDirectory));

// 4. Recursive File Tree Function
// This function walks through the directory and builds a JSON representation.
function buildFileTree(dir) {
    let tree = [];
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
            // Ignore hidden files like .DS_Store
            if (file.name.startsWith('.')) continue;

            const fullPath = path.join(dir, file.name);
            const relativePath = path.relative(projectsDirectory, fullPath);

            if (file.isDirectory()) {
                tree.push({
                    name: file.name,
                    type: 'folder',
                    path: relativePath,
                    // If it's a directory, recursively call the function for its children
                    children: buildFileTree(fullPath)
                });
            } else {
                tree.push({
                    name: file.name,
                    type: 'file',
                    path: relativePath,
                    extension: path.extname(file.name).toLowerCase()
                });
            }
        }
        // Simple sort: folders first, then files alphabetically
        tree.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
    } catch (error) {
        // If a directory doesn't exist (e.g., 'projects'), don't crash the server.
        console.warn(`Warning: Could not read directory ${dir}. It may not exist.`);
        return []; // Return an empty array if the directory can't be read.
    }
    return tree;
}

// 5. API Endpoint to get the file structure
// The frontend will call this to get all the data it needs to display.
app.get('/api/files', (req, res) => {
    try {
        const fileTree = buildFileTree(projectsDirectory);
        res.json(fileTree);
    } catch (error) {
        console.error("Error building file tree:", error);
        res.status(500).json({ error: 'Failed to read project files.' });
    }
});

// 6. Route for Viewing Markdown and Text Files
// **FIX APPLIED HERE (V2)**
// The previous named parameter fix caused a new error with the path-to-regexp library.
// Using a raw regular expression `/\/view\/(.*)/` is a more robust way
// to capture all sub-paths without ambiguity in the route parser.
app.get(/\/view\/(.*)/, (req, res) => {
    // We now access the captured group from the regex, which is at index 0 of req.params.
    const filePathParam = req.params[0];
    const fullFilePath = path.join(projectsDirectory, filePathParam);

    fs.readFile(fullFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`File not found: ${fullFilePath}`, err);
            return res.status(404).send('File not found');
        }

        const extension = path.extname(fullFilePath).toLowerCase();
        let contentHtml;
        const fileName = path.basename(fullFilePath);

        // Render Markdown
        if (extension === '.md') {
            contentHtml = marked.parse(data);
        }
        // Render Text files
        else if (extension === '.txt') {
            // Escape HTML to prevent injection and wrap in <pre> for formatting
            const escapedText = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            contentHtml = `<pre><code>${escapedText}</code></pre>`;
        } else {
            return res.status(400).send('Unsupported file type for viewing.');
        }

        // Use a template file to display the content beautifully
        fs.readFile(path.join(__dirname, 'views', 'viewer.html'), 'utf8', (err, template) => {
            if (err) {
                console.error(`Could not load viewer template.`, err);
                return res.status(500).send('Could not load viewer template.');
            }
            const finalHtml = template
                .replace('{{fileContent}}', contentHtml)
                .replace('{{fileName}}', fileName);
            res.send(finalHtml);
        });
    });
});


// 7. Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
