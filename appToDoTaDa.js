// DOM Elements
// shareAppIcon, qrCodeModal, closeQrModal will be defined in setupEventListeners
const categoriesContainer = document.getElementById('categoriesContainer');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryModal = document.getElementById('categoryModal');
const taskModal = document.getElementById('taskModal');
const categoryNameInput = document.getElementById('categoryName');
const taskNameInput = document.getElementById('taskName');
const saveCategoryBtn = document.getElementById('saveCategory');
const cancelCategoryBtn = document.getElementById('cancelCategory');
const saveTaskBtn = document.getElementById('saveTask');
const cancelTaskBtn = document.getElementById('cancelTask');

// State
let categories = JSON.parse(localStorage.getItem('todoCategories')) || [];
let categoryAccordionStates = JSON.parse(localStorage.getItem('categoryAccordionStates')) || {};
let currentCategoryId = null;
let draggedItem = null;
let draggedItemType = null; // 'task' or 'category'
let touchDragItem = null;
let touchStartX, touchStartY;
let cloneOffsetX, cloneOffsetY;
let draggedElementClone = null;
let currentOverElement = null; // Element currently being hovered over during touch drag

// Initialize the app
function init() {
    renderCategories();
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Share Icon and Modal Elements - Define them here so they are looked up after DOM is ready
    const shareAppIcon = document.getElementById('shareAppIcon');
    const qrCodeModal = document.getElementById('qrCodeModal');
    const closeQrModal = document.getElementById('closeQrModal'); // Corrected ID

    // Category modal
    addCategoryBtn.addEventListener('click', () => openModal('category'));
    saveCategoryBtn.addEventListener('click', saveCategory);
    cancelCategoryBtn.addEventListener('click', () => closeModal('category'));
    
    // Task modal
    saveTaskBtn.addEventListener('click', saveTask);
    cancelTaskBtn.addEventListener('click', () => closeModal('task'));
    
    // Close modals when clicking outside
    [categoryModal, taskModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id.replace('Modal', ''));
            }
        });
    });
    
    // Drag and drop for categories container (for reordering categories)
    categoriesContainer.addEventListener('dragover', handleCategoryContainerDragOver);
    categoriesContainer.addEventListener('drop', handleCategoryContainerDrop);

    // Touch events for the main container (less common, but for safety)
    // categoriesContainer.addEventListener('touchmove', handleCategoryContainerDragOver); // Might be too broad
    // categoriesContainer.addEventListener('touchend', handleCategoryContainerDrop);

    // Share App QR Code Modal
    if (shareAppIcon) {
        shareAppIcon.addEventListener('click', () => {
            if (qrCodeModal) {
                qrCodeModal.style.display = 'flex'; // Use flex for centering
            }
        });
    }

    if (closeQrModal) { // Corrected variable name
        closeQrModal.addEventListener('click', () => { // Corrected variable name
            if (qrCodeModal) {
                qrCodeModal.style.display = 'none';
            }
        });
    }

    // Close QR modal when clicking outside its content
    if (qrCodeModal) {
        qrCodeModal.addEventListener('click', (e) => {
            if (e.target === qrCodeModal) { // Check if the click is on the modal background
                qrCodeModal.style.display = 'none';
            }
        });
    }
}

// Render all categories and their tasks
function renderCategories() {
    categoriesContainer.innerHTML = '';
    
    if (categories.length === 0) {
        categoriesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No categories yet. Add one to get started!</p>
            </div>
        `;
        return;
    }
    
    categories.forEach((category) => {
        const categoryElement = createCategoryElement(category);
        categoriesContainer.appendChild(categoryElement);
    });
    
    // Add event listeners to the newly created elements
    setupDynamicEventListeners();
}

function createCategoryElement(category) {
    const categoryElement = document.createElement('div');
    categoryElement.className = 'category';
    categoryElement.dataset.id = category.id;
    categoryElement.draggable = true;
    // Attach drag event listeners directly
    categoryElement.addEventListener('dragstart', handleCategoryDragStart);
    categoryElement.addEventListener('dragend', handleDragEnd);
    
    let tasksHTML = '';
    if (category.tasks && category.tasks.length > 0) {
        tasksHTML = category.tasks.map((task) => createTaskElementHTML(task, category.id)).join('');
    } else {
        tasksHTML = `
            <div class="empty-state empty-state-task">
                <i class="fas fa-tasks"></i>
                <p>No tasks in this category. Add one!</p>
            </div>
        `;
    }
    
    categoryElement.innerHTML = `
        <div class="category-header">
            <h3 class="category-title" style="cursor:pointer;" data-category-id="${category.id}">${category.name}</h3>
            <div class="category-actions">
                <button class="add-task" data-category-id="${category.id}" aria-label="Add task to ${category.name}">
                    <i class="fas fa-plus-circle"></i>
                </button>
                <button class="edit-category" data-category-id="${category.id}" aria-label="Edit category ${category.name}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-category" data-category-id="${category.id}" aria-label="Delete category ${category.name}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="tasks-list" data-category-id="${category.id}">
            ${tasksHTML}
        </div>
        <button class="add-task-btn" data-category-id="${category.id}">
            <i class="fas fa-plus"></i> Add Task
        </button>
    `;
    // Restore accordion state
    if (categoryAccordionStates[category.id] === 'closed') {
        categoryElement.classList.add('accordion-closed');
        categoryElement.classList.remove('accordion-open');
        const tasksList = categoryElement.querySelector('.tasks-list');
        const addTaskBtn = categoryElement.querySelector('.add-task-btn');
        if (tasksList) tasksList.style.display = 'none';
        if (addTaskBtn) addTaskBtn.style.display = 'none';
    } else {
        categoryElement.classList.add('accordion-open');
        categoryElement.classList.remove('accordion-closed');
        const tasksList = categoryElement.querySelector('.tasks-list');
        const addTaskBtn = categoryElement.querySelector('.add-task-btn');
        if (tasksList) tasksList.style.display = '';
        if (addTaskBtn) addTaskBtn.style.display = '';
    }
    return categoryElement;
}

function createTaskElementHTML(task, categoryId) {
    return `
        <div class="task ${task.completed ? 'completed' : ''}" 
             data-id="${task.id}" 
             data-category-id="${categoryId}"
             draggable="true">
            <input type="checkbox" 
                   class="task-checkbox" 
                   ${task.completed ? 'checked' : ''}
                   data-category-id="${categoryId}" 
                   data-task-id="${task.id}" 
                   aria-label="${task.text} ${task.completed ? 'completed' : 'not completed'}">
            <p class="task-text">${task.text}</p>
            <div class="task-actions">
                <button class="edit-task" 
                        data-category-id="${categoryId}" 
                        data-task-id="${task.id}" 
                        aria-label="Edit task ${task.text}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-task" 
                        data-category-id="${categoryId}" 
                        data-task-id="${task.id}" 
                        aria-label="Delete task ${task.text}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Set up event listeners for dynamically created elements
function setupDynamicEventListeners() {
    // Accordion toggle for category-title
    document.querySelectorAll('.category-title').forEach(titleEl => {
        titleEl.removeEventListener('click', handleCategoryAccordionClick);
        titleEl.addEventListener('click', handleCategoryAccordionClick);
    });

    // Category drag events
    document.querySelectorAll('.category').forEach(categoryEl => {
        // Touch events for categories
        categoryEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        categoryEl.addEventListener('touchmove', handleTouchMove, { passive: false });
        categoryEl.addEventListener('touchend', handleTouchEnd);
    });

    // Task drag events
    document.querySelectorAll('.task').forEach(taskEl => {
        taskEl.addEventListener('dragstart', handleTaskDragStart);
        taskEl.addEventListener('dragend', handleDragEnd);
        // Touch events for tasks
        taskEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        taskEl.addEventListener('touchmove', handleTouchMove, { passive: false });
        taskEl.addEventListener('touchend', handleTouchEnd);
    });

    // Task list drop events (for tasks)
    document.querySelectorAll('.tasks-list').forEach(list => {
        list.addEventListener('dragover', handleTaskListDragOver);
        list.addEventListener('dragenter', handleDragEnter);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop', handleTaskDrop);
    });

    // Task checkboxes
    document.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.removeEventListener('change', toggleTaskComplete); // Remove old before adding new
        checkbox.addEventListener('change', toggleTaskComplete);
    });
    
    // Edit task buttons
    document.querySelectorAll('.edit-task').forEach(button => {
        button.removeEventListener('click', handleEditTaskClick); 
        button.addEventListener('click', handleEditTaskClick);
    });
    
    // Delete task buttons
    document.querySelectorAll('.delete-task').forEach(button => {
        button.removeEventListener('click', handleDeleteTaskClick);
        button.addEventListener('click', handleDeleteTaskClick);
    });
    
    // Add task buttons (both icon and text button)
    document.querySelectorAll('.add-task, .add-task-btn').forEach(button => {
        button.removeEventListener('click', handleAddTaskClick);
        button.addEventListener('click', handleAddTaskClick);
    });

    // Edit category buttons
    document.querySelectorAll('.edit-category').forEach(button => {
        button.removeEventListener('click', handleEditCategoryClick);
        button.addEventListener('click', handleEditCategoryClick);
    });
    
    // Delete category buttons
    document.querySelectorAll('.delete-category').forEach(button => {
        button.removeEventListener('click', handleDeleteCategoryClick);
        button.addEventListener('click', handleDeleteCategoryClick);
    });
}

// Accordion handler for category-title
function handleCategoryAccordionClick(e) {
    const titleEl = e.currentTarget;
    const categoryId = titleEl.dataset.categoryId;
    const categoryEl = titleEl.closest('.category');
    const tasksList = categoryEl.querySelector('.tasks-list');
    const addTaskBtn = categoryEl.querySelector('.add-task-btn');
    if (categoryEl.classList.contains('accordion-open')) {
        // Collapse
        tasksList.style.display = 'none';
        addTaskBtn.style.display = 'none';
        categoryEl.classList.remove('accordion-open');
        categoryEl.classList.add('accordion-closed');
        categoryAccordionStates[categoryId] = 'closed';
    } else {
        // Expand
        tasksList.style.display = '';
        addTaskBtn.style.display = '';
        categoryEl.classList.remove('accordion-closed');
        categoryEl.classList.add('accordion-open');
        categoryAccordionStates[categoryId] = 'open';
    }
    localStorage.setItem('categoryAccordionStates', JSON.stringify(categoryAccordionStates));
}

// Event Handlers for buttons
function handleEditTaskClick(e) {
    const categoryId = e.currentTarget.dataset.categoryId;
    const taskId = e.currentTarget.dataset.taskId;
    editTask(categoryId, taskId);
}

function handleDeleteTaskClick(e) {
    const categoryId = e.currentTarget.dataset.categoryId;
    const taskId = e.currentTarget.dataset.taskId;
    deleteTask(categoryId, taskId);
}

function handleAddTaskClick(e) {
    e.stopPropagation();
    const categoryId = e.currentTarget.dataset.categoryId;
    if (categoryId) {
        openModal('task', categoryId);
    }
}

function handleEditCategoryClick(e) {
    e.stopPropagation();
    const categoryId = e.currentTarget.dataset.categoryId;
    editCategory(categoryId);
}

function handleDeleteCategoryClick(e) {
    e.stopPropagation();
    const categoryId = e.currentTarget.dataset.categoryId;
    deleteCategory(categoryId);
}

// Drag and Drop Handlers
// Touch Event Handlers
function handleTouchStart(e) {
    // Robustly remove any pre-existing clone to prevent orphans
    if (draggedElementClone) {
        if (draggedElementClone.parentNode) {
            draggedElementClone.parentNode.removeChild(draggedElementClone);
        }
        draggedElementClone = null; // Ensure it's nulled
    }
    // e.preventDefault(); // Prevent default touch behaviors like scrolling, IF NEEDED for the item itself
    const target = e.currentTarget;
    if (!target.draggable) return; // Only for draggable items

    touchDragItem = target;
    draggedItem = target; // Keep using draggedItem for shared logic if possible

    if (target.classList.contains('category')) {
        draggedItemType = 'category';
    } else if (target.classList.contains('task')) {
        draggedItemType = 'task';
        // Only stop propagation if not clicking a button or interactive element
        if (!(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('edit-task') || e.target.classList.contains('delete-task') || e.target.classList.contains('add-task'))) {
            e.stopPropagation();
        }
    }

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    // Create and style the clone
    draggedElementClone = touchDragItem.cloneNode(true);
    draggedElementClone.classList.add('dragging-clone');
    draggedElementClone.style.position = 'absolute';
    draggedElementClone.style.zIndex = '2000';
    draggedElementClone.style.pointerEvents = 'none'; // So it doesn't interfere with elementFromPoint
    draggedElementClone.style.width = `${touchDragItem.offsetWidth}px`;
    draggedElementClone.style.height = `${touchDragItem.offsetHeight}px`;
    
    const rect = touchDragItem.getBoundingClientRect();
    cloneOffsetX = touchStartX - rect.left;
    cloneOffsetY = touchStartY - rect.top;

    draggedElementClone.style.left = `${(touchStartX - cloneOffsetX) + window.scrollX}px`;
    draggedElementClone.style.top = `${(touchStartY - cloneOffsetY) + window.scrollY}px`;
    
    document.body.appendChild(draggedElementClone);
    touchDragItem.classList.add('dragging'); // Style original item
}

function handleTouchMove(e) {
    if (!touchDragItem || !draggedElementClone) return;
    e.preventDefault(); // Crucial to prevent scrolling while dragging

    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    draggedElementClone.style.left = `${(currentX - cloneOffsetX) + window.scrollX}px`;
    draggedElementClone.style.top = `${(currentY - cloneOffsetY) + window.scrollY}px`;

    // Drop target detection
    draggedElementClone.style.visibility = 'hidden'; // Hide clone temporarily to find element underneath
    const elementBelow = document.elementFromPoint(currentX, currentY);
    draggedElementClone.style.visibility = 'visible';

    if (currentOverElement) {
        currentOverElement.classList.remove('drag-over');
        currentOverElement = null;
    }

    if (elementBelow) {
        if (draggedItemType === 'task') {
            const taskListBelow = elementBelow.closest('.tasks-list');
            // Allow dropping in any tasks-list, including the original one for reordering.
            if (taskListBelow) { 
                taskListBelow.classList.add('drag-over');
                currentOverElement = taskListBelow;
            }
        } else if (draggedItemType === 'category') {
            const categoryBelow = elementBelow.closest('.category');
            // Check if it's a different category or the main container for reordering
            if (categoryBelow && categoryBelow !== touchDragItem) {
                 // For reordering categories, the drop target is effectively categoriesContainer
                categoriesContainer.classList.add('drag-over');
                currentOverElement = categoriesContainer; 
            } else if (elementBelow.closest('.categories-container') && !categoryBelow){
                // If over container but not a specific category, also valid for category drop
                categoriesContainer.classList.add('drag-over');
                currentOverElement = categoriesContainer;
            }
        }
    }
}

function handleTouchEnd(e) {
    if (!touchDragItem || !draggedElementClone) return;

    if (currentOverElement) {
        currentOverElement.classList.remove('drag-over');
        // Simulate drop logic based on currentOverElement
        if (draggedItemType === 'task' && currentOverElement.classList.contains('tasks-list')) {
            // Simulate task drop
            const taskId = touchDragItem.dataset.id;
            const sourceCategoryId = touchDragItem.dataset.categoryId;
            const targetCategoryId = currentOverElement.dataset.categoryId;
            moveTask(taskId, sourceCategoryId, targetCategoryId, currentOverElement, e.changedTouches[0].clientY);
        } else if (draggedItemType === 'category' && currentOverElement.classList.contains('categories-container')) {
            // Simulate category drop
            const categoryId = touchDragItem.dataset.id;
            moveCategory(categoryId, currentOverElement, e.changedTouches[0].clientY);
        }
    }

    if (draggedElementClone) {
        if (draggedElementClone.parentNode) {
            draggedElementClone.parentNode.removeChild(draggedElementClone);
        }
        draggedElementClone = null; // Ensure it's nulled after removal
    }
    if (touchDragItem) { // Check if touchDragItem still exists
        touchDragItem.classList.remove('dragging');
    }
    touchDragItem = null;
    draggedItem = null; // Reset desktop D&D item too
    draggedItemType = null;
    currentOverElement = null;

    // No full re-render here if moveTask/moveCategory handles it
    // renderCategories(); // Fallback if not handled by specific move functions
}

// Refactored move logic to be callable by both D&D and Touch
function moveTask(taskId, sourceCategoryId, targetCategoryId, targetTasksListElement, clientY) {
    const sourceCategory = categories.find(cat => cat.id === sourceCategoryId);
    const targetCategory = categories.find(cat => cat.id === targetCategoryId);

    if (!sourceCategory || !targetCategory) return;

    const taskIndex = sourceCategory.tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;

    const [movedTask] = sourceCategory.tasks.splice(taskIndex, 1);

    const afterElement = getDragAfterElement(targetTasksListElement, clientY, '.task:not(.dragging)');
    if (afterElement == null) {
        targetCategory.tasks.push(movedTask);
    } else {
        const targetTaskIndex = targetCategory.tasks.findIndex(t => t.id === afterElement.dataset.id);
        if (targetTaskIndex !== -1) {
            targetCategory.tasks.splice(targetTaskIndex, 0, movedTask);
        } else { // Fallback if afterElement's task not found (e.g. it's the placeholder)
            targetCategory.tasks.push(movedTask);
        }
    }
    
    movedTask.categoryId = targetCategoryId; 

    saveToLocalStorage();
    renderCategories();
}

function moveCategory(categoryId, targetContainerElement, clientY) {
    const draggedIndex = categories.findIndex(cat => cat.id === categoryId);
    if (draggedIndex === -1) return;

    const [movedCategory] = categories.splice(draggedIndex, 1);
    const afterElement = getDragAfterElement(targetContainerElement, clientY, '.category:not(.dragging)');

    if (afterElement == null) {
        categories.push(movedCategory);
    } else {
        const targetId = afterElement.dataset.id;
        const targetIndex = categories.findIndex(cat => cat.id === targetId);
        if (targetIndex !== -1) {
            categories.splice(targetIndex, 0, movedCategory);
        } else {
             categories.push(movedCategory); // Fallback
        }
    }

    saveToLocalStorage();
    renderCategories();
    // Do NOT call setupDynamicEventListeners here; let renderCategories handle it
}


// HTML5 Drag and Drop Handlers (modified to use moveTask/moveCategory)
function handleCategoryDragStart(e) {
    draggedItem = this;
    draggedItemType = 'category';
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id); 
}

function handleTaskDragStart(e) {
    draggedItem = this;
    draggedItemType = 'task';
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
    e.dataTransfer.setData('source-category-id', this.dataset.categoryId);
    // e.dataTransfer.setDragImage(new Image(), 0, 0); // Optional
    // Only stop propagation if not clicking a button or interactive element
    if (!(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('edit-task') || e.target.classList.contains('delete-task') || e.target.classList.contains('add-task'))) {
        e.stopPropagation(); // Prevent category drag from firing
    }
}

function handleDragEnd() {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedItem = null;
    draggedItemType = null;
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this.classList.contains('tasks-list') && draggedItemType === 'task') {
        this.classList.add('drag-over');
    }
    if (this.classList.contains('categories-container') && draggedItemType === 'category'){
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

// Drag over for the main categories container (for reordering categories)
function handleCategoryContainerDragOver(e) {
    e.preventDefault();
    if (draggedItemType === 'category') {
        e.dataTransfer.dropEffect = 'move';
        // Visual cue for drop position can be managed by :hover or specific dragover on categoriesContainer itself
        categoriesContainer.classList.add('drag-over'); // Add to container for general visual cue
    }
}

// Drop on the main categories container (for reordering categories)
function handleCategoryContainerDrop(e) {
    e.preventDefault();
    categoriesContainer.classList.remove('drag-over');
    if (draggedItemType !== 'category' || !draggedItem) return;

    const draggedId = e.dataTransfer.getData('text/plain') || (draggedItem ? draggedItem.dataset.id : null);
    if (!draggedId) return;

    moveCategory(draggedId, categoriesContainer, e.clientY);
    // After drag and drop, persist accordion states
    localStorage.setItem('categoryAccordionStates', JSON.stringify(categoryAccordionStates));

    if (draggedItem) draggedItem.classList.remove('dragging');
    draggedItem = null;
    draggedItemType = null;
}

// Drag over for a task list (for tasks)
function handleTaskListDragOver(e) {
    e.preventDefault();
    if (draggedItemType === 'task') {
        e.dataTransfer.dropEffect = 'move';
        // `this` is the tasks-list element
        this.classList.add('drag-over'); 
    } else {
        e.dataTransfer.dropEffect = 'none'; // Prevent dropping categories onto task lists
    }
}

// Drop on a task list (for tasks)
function handleTaskDrop(e) {
    e.preventDefault();
    e.stopPropagation(); // Prevent drop from bubbling to category container
    this.classList.remove('drag-over');

    if (draggedItemType !== 'task' || !draggedItem) return;

    const taskId = e.dataTransfer.getData('text/plain') || (draggedItem ? draggedItem.dataset.id : null);
    const sourceCategoryId = e.dataTransfer.getData('source-category-id') || (draggedItem ? draggedItem.dataset.categoryId : null);
    const targetCategoryId = this.dataset.categoryId; // `this` is the tasks-list

    if (!taskId || !sourceCategoryId || !targetCategoryId) return;

    moveTask(taskId, sourceCategoryId, targetCategoryId, this, e.clientY);

    if (draggedItem) draggedItem.classList.remove('dragging');
    draggedItem = null;
    draggedItemType = null;
}

function getDragAfterElement(container, y, selector) {
    const draggableElements = [...container.querySelectorAll(selector)];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect(); // Original declaration
        const offset = y - box.top - box.height / 2; // Original declaration
        // Element is considered 'after' if the cursor is above its midpoint
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Category CRUD Operations
function openModal(type, id = null, currentName = '') {
    if (type === 'category') {
        currentCategoryId = id; // Store id for editing, null for new
        categoryNameInput.value = currentName;
        categoryModal.classList.add('active');
        categoryNameInput.focus();
    } else if (type === 'task') {
        currentCategoryId = id; // This is the categoryId to add the task to
        taskNameInput.value = currentName; // currentName for editing task, empty for new
        // If editing, id is taskId. If new, id is categoryId.
        // We need a way to distinguish if we are editing a task or adding a new one.
        // For now, task modal is only for new tasks under currentCategoryId.
        // For editing task, we use prompt.
        taskModal.classList.add('active');
        taskNameInput.focus();
    }
}

function closeModal(type) {
    if (type === 'category') {
        categoryModal.classList.remove('active');
    } else if (type === 'task') {
        taskModal.classList.remove('active');
    }
    currentCategoryId = null; // Reset after modal closes
}

function saveCategory() {
    const name = categoryNameInput.value.trim();
    if (!name) {
        alert('Please enter a category name');
        return;
    }
    
    if (currentCategoryId) { // Editing existing category
        const category = categories.find(cat => cat.id === currentCategoryId);
        if (category) category.name = name;
    } else { // Adding new category
        const newCategory = {
            id: generateId(),
            name: name,
            tasks: []
        };
        categories.push(newCategory);
    }
    
    saveToLocalStorage();
    renderCategories();
    closeModal('category');
}

function editCategory(categoryId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
        openModal('category', categoryId, category.name);
    }
}

function deleteCategory(categoryId) {
    if (confirm('Are you sure you want to delete this category and all its tasks?')) {
        categories = categories.filter(cat => cat.id !== categoryId);
        saveToLocalStorage();
        renderCategories();
    }
}

// Task CRUD Operations
function saveTask() {
    const text = taskNameInput.value.trim();
    if (!text) {
        alert('Please enter a task name');
        return;
    }
    
    if (!currentCategoryId) return; // Should be set when task modal is opened
    
    const category = categories.find(cat => cat.id === currentCategoryId);
    if (!category) return;
    
    const newTask = {
        id: generateId(),
        text: text,
        completed: false
    };
    category.tasks.push(newTask);
    
    saveToLocalStorage();
    renderCategories();
    closeModal('task');
}

function toggleTaskComplete(e) {
    const categoryId = e.target.dataset.categoryId;
    const taskId = e.target.dataset.taskId;
    
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    const task = category.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.completed = !task.completed;
    
    const taskElement = e.target.closest('.task');
    if (taskElement) {
        taskElement.classList.toggle('completed', task.completed);
    }
    
    saveToLocalStorage();
    // No full re-render needed, just class toggle and save
    // However, if other parts of the UI depend on this, a selective update or full render might be chosen.
    // For now, keeping it minimal.
}

function editTask(categoryId, taskId) {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    const task = category.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newText = prompt('Edit task:', task.text);
    if (newText !== null && newText.trim() !== '') {
        task.text = newText.trim();
        saveToLocalStorage();
        renderCategories(); // Re-render to show updated text
    }
}

function deleteTask(categoryId, taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;
    
    category.tasks = category.tasks.filter(task => task.id !== taskId);
    saveToLocalStorage();
    renderCategories();
}

// Helper Functions
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function saveToLocalStorage() {
    localStorage.setItem('todoCategories', JSON.stringify(categories));
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Make the app available globally for debugging (optional)
window.todoApp = {
    categories,
    renderCategories,
    saveToLocalStorage,
    deleteCategory, // For easier debugging
    deleteTask      // For easier debugging
};
