// Assignment & Deadline Tracker
class AssignmentTracker {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.selectedTask = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderTasks();
        this.renderCalendar();
        this.updateSubjectFilter();
        this.checkReminders();
        this.setupNotifications();
        
        // Set default deadline to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        document.getElementById('task-deadline').value = tomorrow.toISOString().slice(0, 16);
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => this.showAddTaskModal());

        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => this.hideAddTaskModal());
        document.getElementById('cancel-task').addEventListener('click', () => this.hideAddTaskModal());
        document.getElementById('close-detail-modal').addEventListener('click', () => this.hideTaskDetailModal());

        // Task form
        document.getElementById('task-form').addEventListener('submit', (e) => this.addTask(e));

        // Subject filter
        document.getElementById('subject-select').addEventListener('change', (e) => this.filterTasks(e.target.value));

        // Calendar controls
        document.getElementById('prev-month').addEventListener('click', () => this.previousMonth());
        document.getElementById('next-month').addEventListener('click', () => this.nextMonth());

        // Task detail modal actions
        document.getElementById('delete-task').addEventListener('click', () => this.deleteTask());
        document.getElementById('mark-complete').addEventListener('click', () => this.markTaskComplete());

        // Modal backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        if (tabName === 'calendar') {
            this.renderCalendar();
        }
    }

    showAddTaskModal() {
        document.getElementById('task-modal').classList.add('active');
        document.getElementById('task-title').focus();
    }

    hideAddTaskModal() {
        document.getElementById('task-modal').classList.remove('active');
        document.getElementById('task-form').reset();
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        document.getElementById('task-deadline').value = tomorrow.toISOString().slice(0, 16);
    }

    showTaskDetailModal(task) {
        this.selectedTask = task;
        document.getElementById('detail-title').textContent = task.title;
        
        const detailsHtml = `
            <div class="task-detail-item">
                <h4>Subject</h4>
                <p>${task.subject}</p>
            </div>
            <div class="task-detail-item">
                <h4>Description</h4>
                <p>${task.description || 'No description provided'}</p>
            </div>
            <div class="task-detail-item">
                <h4>Deadline</h4>
                <p>${this.formatDateTime(task.deadline)}</p>
            </div>
            <div class="task-detail-item">
                <h4>Priority</h4>
                <p><span class="task-priority ${task.priority}">${task.priority.toUpperCase()}</span></p>
            </div>
            <div class="task-detail-item">
                <h4>Status</h4>
                <p>${task.completed ? 'Completed' : 'Pending'}</p>
            </div>
        `;
        
        document.getElementById('task-details').innerHTML = detailsHtml;
        document.getElementById('task-detail-modal').classList.add('active');
    }

    hideTaskDetailModal() {
        document.getElementById('task-detail-modal').classList.remove('active');
        this.selectedTask = null;
    }

    addTask(e) {
        e.preventDefault();
        
        const task = {
            id: Date.now(),
            title: document.getElementById('task-title').value,
            subject: document.getElementById('task-subject').value,
            description: document.getElementById('task-description').value,
            deadline: document.getElementById('task-deadline').value,
            priority: document.getElementById('task-priority').value,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.saveTasks();
        this.renderTasks();
        this.updateSubjectFilter();
        this.hideAddTaskModal();
        this.showNotification('Assignment added successfully!', 'success');
    }

    deleteTask() {
        if (this.selectedTask) {
            this.tasks = this.tasks.filter(task => task.id !== this.selectedTask.id);
            this.saveTasks();
            this.renderTasks();
            this.updateSubjectFilter();
            this.hideTaskDetailModal();
            this.showNotification('Assignment deleted successfully!', 'success');
        }
    }

    markTaskComplete() {
        if (this.selectedTask) {
            this.selectedTask.completed = true;
            this.saveTasks();
            this.renderTasks();
            this.hideTaskDetailModal();
            this.showNotification('Assignment marked as complete!', 'success');
        }
    }

    renderTasks(filteredTasks = null) {
        const tasksToRender = filteredTasks || this.tasks;
        const container = document.getElementById('tasks-container');
        
        if (tasksToRender.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; color: #cbd5e0; margin-bottom: 1rem;"></i>
                    <h3>No assignments yet</h3>
                    <p>Click "Add Assignment" to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tasksToRender
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .map(task => this.createTaskCard(task))
            .join('');
    }

    createTaskCard(task) {
        const deadline = new Date(task.deadline);
        const now = new Date();
        const isOverdue = deadline < now && !task.completed;
        const isUrgent = deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && !task.completed;
        
        const cardClasses = ['task-card'];
        if (task.completed) cardClasses.push('completed');
        if (isUrgent) cardClasses.push('urgent');

        return `
            <div class="${cardClasses.join(' ')}" onclick="app.showTaskDetailModal(${JSON.stringify(task).replace(/"/g, '&quot;')})">
                <div class="task-header">
                    <div>
                        <div class="task-title">${task.title}</div>
                        <div class="task-subject">${task.subject}</div>
                    </div>
                    <div class="task-priority ${task.priority}">${task.priority}</div>
                </div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-footer">
                    <div class="task-deadline ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-clock"></i>
                        ${isOverdue ? 'Overdue' : this.formatDeadline(deadline)}
                    </div>
                </div>
            </div>
        `;
    }

    filterTasks(subject) {
        if (subject === 'all') {
            this.renderTasks();
        } else {
            const filteredTasks = this.tasks.filter(task => task.subject === subject);
            this.renderTasks(filteredTasks);
        }
    }

    updateSubjectFilter() {
        const subjects = [...new Set(this.tasks.map(task => task.subject))];
        const select = document.getElementById('subject-select');
        
        select.innerHTML = '<option value="all">All Subjects</option>';
        
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            select.appendChild(option);
        });
    }

    renderCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('current-month');
        
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        monthYear.textContent = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        let calendarHTML = '';
        const today = new Date();
        
        for (let i = 0; i < 42; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const isToday = currentDate.toDateString() === today.toDateString();
            const isCurrentMonth = currentDate.getMonth() === this.currentMonth;
            const dayTasks = this.getTasksForDate(currentDate);
            
            const dayClasses = ['calendar-day'];
            if (!isCurrentMonth) dayClasses.push('other-month');
            if (isToday) dayClasses.push('today');
            if (dayTasks.length > 0) dayClasses.push('has-task');
            
            calendarHTML += `
                <div class="${dayClasses.join(' ')}" onclick="app.showDayTasks('${currentDate.toISOString()}')">
                    <div class="day-number">${currentDate.getDate()}</div>
                    ${dayTasks.length > 0 ? `<div class="day-tasks">${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}</div>` : ''}
                </div>
            `;
        }
        
        grid.innerHTML = calendarHTML;
    }

    getTasksForDate(date) {
        return this.tasks.filter(task => {
            const taskDate = new Date(task.deadline);
            return taskDate.toDateString() === date.toDateString();
        });
    }

    showDayTasks(dateString) {
        const date = new Date(dateString);
        const tasks = this.getTasksForDate(date);
        
        if (tasks.length === 0) {
            this.showNotification(`No assignments for ${date.toLocaleDateString()}`, 'info');
            return;
        }
        
        const taskList = tasks.map(task => `• ${task.title} (${task.subject})`).join('\n');
        this.showNotification(`Assignments for ${date.toLocaleDateString()}:\n${taskList}`, 'info');
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.renderCalendar();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.renderCalendar();
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatDeadline(deadline) {
        const now = new Date();
        const diff = deadline - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} left`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} left`;
        } else {
            return 'Due soon';
        }
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    checkReminders() {
        const now = new Date();
        const overdueTasks = this.tasks.filter(task => {
            if (task.completed) return false;
            return new Date(task.deadline) < now;
        });
        
        if (overdueTasks.length > 0) {
            this.showNotification(`You have ${overdueTasks.length} overdue assignment${overdueTasks.length > 1 ? 's' : ''}!`, 'warning');
        }
    }

    setupNotifications() {
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        if (type === 'warning' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Assignment Tracker', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Initialize the application
const app = new AssignmentTracker();

// Check for reminders every minute
setInterval(() => {
    app.checkReminders();
}, 60000);

// Add sample data if no tasks exist
if (app.tasks.length === 0) {
    const sampleTasks = [
        {
            id: 1,
            title: 'Research Paper on Climate Change',
            subject: 'Environmental Science',
            description: 'Write a 10-page research paper on the impact of climate change on biodiversity',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high',
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            title: 'Calculus Problem Set',
            subject: 'Mathematics',
            description: 'Complete problems 1-15 in Chapter 3',
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'medium',
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            title: 'Literature Review',
            subject: 'English',
            description: 'Review and analyze three academic papers on modern literature',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'low',
            completed: false,
            createdAt: new Date().toISOString()
        }
    ];
    
    app.tasks = sampleTasks;
    app.saveTasks();
    app.renderTasks();
    app.updateSubjectFilter();
} 