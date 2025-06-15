document.addEventListener('DOMContentLoaded', () => {
    const fileTreeContainer = document.getElementById('file-tree-container');
    const searchInput = document.getElementById('search-input');
    const loader = document.getElementById('loader');

    // --- Sound Effects using Tone.js ---
    const synth = new Tone.Synth().toDestination();
    const playClickSound = () => {
        // A soft, short click
        synth.triggerAttackRelease("C4", "8n", Tone.now());
    };
    const playToggleSound = () => {
        // A slightly different pitch for expanding/collapsing
        synth.triggerAttackRelease("G4", "8n", Tone.now());
    };


    // --- Fetch and Render File Tree ---
    fetch('/api/files')
        .then(response => response.json())
        .then(data => {
            loader.style.display = 'none'; // Hide loader
            const treeHtml = createTreeHtml(data);
            fileTreeContainer.innerHTML = treeHtml;
            addEventListeners();
        })
        .catch(error => {
            console.error('Error fetching file tree:', error);
            loader.style.display = 'none';
            fileTreeContainer.innerHTML = '<p style="color: #ff6b6b;">Could not load file tree.</p>';
        });

    function createTreeHtml(nodes) {
        let html = '<ul class="file-tree">';
        for (const node of nodes) {
            const isProject = node.type === 'folder' && node.children.some(child => child.name === 'index.html');
            
            html += `<li class="tree-item ${node.type === 'folder' ? 'collapsed' : ''}" data-path="${node.path}">`;
            
            // Determine the link and icon for the item
            let link = '#';
            let icon = '';
            if (node.type === 'folder') {
                icon = '<span class="folder-arrow">▶</span> 📁';
                 // If it's a runnable project, the main link goes to the project root
                if (isProject) {
                    link = `/${node.path}/`;
                }
            } else {
                icon = getFileIcon(node.extension);
                // Link to the custom viewer for .md and .txt files
                if (node.extension === '.md' || node.extension === '.txt') {
                    link = `/view/${node.path}`;
                } else {
                    link = `/${node.path}`; // Direct link for other files
                }
            }
            
            html += `
                <div class="tree-item-content">
                    <span class="tree-item-icon">${icon}</span>
                    <a href="${link}" class="tree-item-link">${node.name}</a>
                </div>
            `;
            
            if (node.type === 'folder' && node.children.length > 0) {
                // Recursively create the HTML for children
                html += createTreeHtml(node.children);
            }
            
            html += '</li>';
        }
        html += '</ul>';
        return html;
    }
    
    function getFileIcon(extension) {
        switch(extension) {
            case '.html': return '🌐';
            case '.css': return '🎨';
            case '.js': return '📜';
            case '.md': return '✒️';
            case '.txt': return '📄';
            case '.png': case '.jpg': case '.jpeg': case '.gif': return '🖼️';
            default: return '❔';
        }
    }


    // --- Add Event Listeners for Interactivity ---
    function addEventListeners() {
        // For expanding/collapsing folders
        fileTreeContainer.addEventListener('click', (e) => {
            const itemContent = e.target.closest('.tree-item-content');
            if (itemContent) {
                const parentLi = itemContent.parentElement;
                if (parentLi.classList.contains('tree-item') && parentLi.classList.contains('collapsed')) {
                    // Check if it's a folder click
                    if(parentLi.querySelector('.folder-arrow')) {
                        e.preventDefault(); // Prevent navigation for folders
                        parentLi.classList.toggle('collapsed');
                        playToggleSound();
                    } else {
                         playClickSound(); // It's a file, play regular click
                    }
                } else if(parentLi.classList.contains('tree-item')) {
                     // It's a file or an already expanded folder
                     if(parentLi.querySelector('.folder-arrow')) {
                        e.preventDefault();
                        parentLi.classList.toggle('collapsed');
                        playToggleSound();
                    } else {
                        playClickSound();
                    }
                }
            }
        });

        // Search functionality
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const allItems = document.querySelectorAll('.tree-item');
            
            allItems.forEach(item => {
                const itemName = item.querySelector('.tree-item-link').textContent.toLowerCase();
                if (itemName.includes(searchTerm)) {
                    // Show the item and all its parents
                    item.classList.remove('hidden');
                    let parent = item.parentElement.closest('.tree-item');
                    while(parent) {
                        parent.classList.remove('hidden');
                        parent = parent.parentElement.closest('.tree-item');
                    }
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    }
});
