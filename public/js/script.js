document.addEventListener('DOMContentLoaded', () => {
    const fileTreeContainer = document.getElementById('file-tree-container');
    const searchInput = document.getElementById('search-input');
    const loader = document.getElementById('loader');
    let allTreeItems = []; // To store a flat list of all items for search

    // --- Sound Effects using Tone.js ---
    const synth = new Tone.Synth().toDestination();
    const playSound = (note, length = "16n") => {
        try {
            synth.triggerAttackRelease(note, length, Tone.now());
        } catch (e) {
            console.warn("Tone.js context not ready for sound.");
        }
    };
    
    // --- SVG Icons ---
    const ICONS = {
        folder: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
        folderOpen: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><path d="M21 12H3"></path></svg>`,
        arrow: `<svg class="folder-arrow" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
        file: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`
    };

    // --- Fetch and Render File Tree ---
    fetch('/api/files')
        .then(response => response.json())
        .then(data => {
            loader.classList.remove('visible');
            const treeElement = createTreeElement(data);
            fileTreeContainer.appendChild(treeElement);
            allTreeItems = Array.from(fileTreeContainer.querySelectorAll('.tree-item'));
            addEventListeners();
        })
        .catch(error => {
            loader.classList.remove('visible');
            fileTreeContainer.innerHTML = `<p style="color: #ff6b6b; padding: 16px;">Could not load file tree. Is the server running?</p>`;
            console.error('Error fetching file tree:', error);
        });

    function createTreeElement(nodes) {
        const ul = document.createElement('ul');
        ul.className = 'file-tree';
        
        for (const node of nodes) {
            const li = document.createElement('li');
            li.className = 'tree-item';
            if (node.type === 'folder') {
                li.classList.add('collapsed');
            }
            li.dataset.path = node.path;
            li.dataset.name = node.name.toLowerCase();

            const isProject = node.type === 'folder' && node.children.some(child => child.name === 'index.html');
            
            let link = '#';
            if (node.type === 'file') {
                link = (node.extension === '.md' || node.extension === '.txt') ? `/view/${node.path}` : `/${node.path}`;
            } else if (isProject) {
                link = `/${node.path}/`;
            }

            li.innerHTML = `
                <div class="item-row">
                    <span class="item-icon">
                        ${node.type === 'folder' ? ICONS.arrow : ICONS.file}
                    </span>
                    <a href="${link}" class="item-link ${isProject ? 'project-link' : ''}" ${link !== '#' ? `target="_blank"` : ''}>${node.name}</a>
                </div>
            `;
            
            if (node.type === 'folder' && node.children.length > 0) {
                li.appendChild(createTreeElement(node.children));
            }
            ul.appendChild(li);
        }
        return ul;
    }
    
    // --- Event Listeners ---
    function addEventListeners() {
        fileTreeContainer.addEventListener('click', (e) => {
            const itemRow = e.target.closest('.item-row');
            if (!itemRow) return;

            const parentLi = itemRow.parentElement;
            if (parentLi.classList.contains('tree-item') && parentLi.querySelector('.file-tree')) {
                // This is a folder, toggle it
                e.preventDefault();
                parentLi.classList.toggle('collapsed');
                playSound(parentLi.classList.contains('collapsed') ? 'C4' : 'E4');
            } else {
                // This is a file, play standard click sound
                playSound('A4');
            }
        });

        searchInput.addEventListener('input', handleSearch);
    }
    
    // --- Search Functionality ---
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();

        if (searchTerm === '') {
            // Reset view if search is cleared
            allTreeItems.forEach(item => {
                item.classList.remove('hidden');
                if (item.querySelector('.file-tree')) {
                    item.classList.add('collapsed');
                }
            });
            return;
        }

        allTreeItems.forEach(item => {
            const itemName = item.dataset.name;
            const matches = itemName.includes(searchTerm);

            if (matches) {
                item.classList.remove('hidden');
                // Reveal all parent folders of the matched item
                let parent = item.parentElement.closest('.tree-item');
                while (parent) {
                    parent.classList.remove('hidden');
                    parent.classList.remove('collapsed'); // Expand parent to show child
                    parent = parent.parentElement.closest('.tree-item');
                }
            } else {
                item.classList.add('hidden');
            }
        });
    }
});
