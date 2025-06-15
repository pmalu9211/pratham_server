// server.js - V2.3 (Final Fixes)

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
function buildFileTree(dir) {
    let tree = [];
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });

        for (const file of files) {
            if (file.name.startsWith('.')) continue;

            const fullPath = path.join(dir, file.name);
            const relativePath = path.relative(projectsDirectory, fullPath);

            if (file.isDirectory()) {
                tree.push({
                    name: file.name,
                    type: 'folder',
                    path: relativePath,
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
        tree.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });
    } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}. It may not exist.`);
        return [];
    }
    return tree;
}

// 5. API Endpoint for file structure
app.get('/api/files', (req, res) => {
    try {
        const fileTree = buildFileTree(projectsDirectory);
        res.json(fileTree);
    } catch (error) {
        console.error("Error building file tree:", error);
        res.status(500).json({ error: 'Failed to read project files.' });
    }
});

// 6. Route for Viewing Files
app.get(/\/view\/(.*)/, (req, res) => {
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

        if (extension === '.md') {
            contentHtml = marked.parse(data);
        } else if (extension === '.txt') {
            const escapedText = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            contentHtml = `<pre><code>${escapedText}</code></pre>`;
        } else {
            return res.status(400).send('Unsupported file type for viewing.');
        }

        fs.readFile(path.join(__dirname, 'views', 'viewer.html'), 'utf8', (err, template) => {
            if (err) {
                console.error(`Could not load viewer template.`, err);
                return res.status(500).send('Could not load viewer template.');
            }
            // **FIX APPLIED HERE**
            // Use a regular expression with the global flag 'g' to replace all occurrences.
            const finalHtml = template
                .replace(/{{fileContent}}/g, contentHtml)
                .replace(/{{fileName}}/g, fileName);
            res.send(finalHtml);
        });
    });
});

// 7. Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
