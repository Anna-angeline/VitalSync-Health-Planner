document.addEventListener("DOMContentLoaded", () => {
    const eventForm = document.getElementById("event-form");
    const eventNameInput = document.getElementById("eventName");
    const eventCategorySelect = document.getElementById("eventCategory");
    const eventDateInput = document.getElementById("eventDate");
    const eventTimeInput = document.getElementById("eventTime");
    const eventNotesInput = document.getElementById("eventNotes");
    
    const eventsContainer = document.getElementById("eventsContainer");
    
    // Dashboard elements
    const todayCountSpan = document.getElementById("todayCount");
    const upcomingCountSpan = document.getElementById("upcomingCount");
    const completedCountSpan = document.getElementById("completedCount");

    // Load events from LocalStorage
    let events = JSON.parse(localStorage.getItem("trustcare_events")) || [];

    // Map categories to UI specifics
    const categoryMap = {
        'doctor': { icon: 'fa-stethoscope', label: 'Doctor', class: 'tag-doctor' },
        'medication': { icon: 'fa-capsules', label: 'Medication', class: 'tag-medication' },
        'exercise': { icon: 'fa-person-running', label: 'Exercise', class: 'tag-exercise' },
        'diet': { icon: 'fa-apple-whole', label: 'Diet', class: 'tag-diet' },
        'mental': { icon: 'fa-brain', label: 'Mental', class: 'tag-mental' },
        'water': { icon: 'fa-glass-water', label: 'Water', class: 'tag-water' }
    };

    // Form submission
    eventForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = eventNameInput.value.trim();
        const category = eventCategorySelect.value;
        const date = eventDateInput.value;
        const time = eventTimeInput.value;
        const notes = eventNotesInput.value.trim();

        if (name && date && time) {
            const newEvent = {
                id: Date.now().toString(),
                name,
                category,
                date,
                time,
                notes,
                completed: false
            };

            events.push(newEvent);
            
            sortEvents();
            saveEvents();
            renderEvents();
            updateDashboard();
            
            eventForm.reset();
            eventNameInput.focus();
        }
    });

    function sortEvents() {
        events.sort((a, b) => {
            // Keep completed at the bottom
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
    }

    function saveEvents() {
        localStorage.setItem("trustcare_events", JSON.stringify(events));
    }

    function formatDate(dateString) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const [year, month, day] = dateString.split('-');
        return new Date(year, month - 1, day).toLocaleDateString(undefined, options);
    }
    
    function formatTime(timeString) {
        const [hour, minute] = timeString.split(':');
        const h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        return `${formattedHour}:${minute} ${ampm}`;
    }

    function getRelativeTimeStr(dateString, timeString) {
        const now = new Date();
        const eventDate = new Date(`${dateString}T${timeString}`);
        const diffMs = eventDate - now;

        if (diffMs < 0) return null; // Past event

        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours <= 2) {
            const mins = Math.ceil(diffMs / (1000 * 60));
            if (mins <= 60) return { text: `In ${mins} mins`, urgent: true };
            return { text: `In 1 hour`, urgent: true };
        } else if (diffHours < 24 && eventDate.getDate() === now.getDate()) {
            return { text: `Today in ${Math.round(diffHours)}h`, urgent: false };
        }
        
        return null;
    }

    function updateDashboard() {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        let todayCount = 0;
        let upcomingCount = 0;
        let completedCount = 0;

        events.forEach(ev => {
            if (ev.completed) {
                completedCount++;
            } else {
                upcomingCount++;
                if (ev.date === todayStr) {
                    todayCount++;
                }
            }
        });

        todayCountSpan.textContent = todayCount;
        upcomingCountSpan.textContent = upcomingCount;
        completedCountSpan.textContent = completedCount;
    }

    // Expose actions to window
    window.toggleComplete = (id) => {
        const eventIndex = events.findIndex(event => event.id === id);
        if (eventIndex !== -1) {
            events[eventIndex].completed = !events[eventIndex].completed;
            sortEvents();
            saveEvents();
            renderEvents();
            updateDashboard();
        }
    };

    window.deleteEvent = (id) => {
        const card = document.querySelector(`.event-card[data-id="${id}"]`);
        
        card.style.transform = 'translateY(20px)';
        card.style.opacity = '0';
        
        setTimeout(() => {
            events = events.filter(event => event.id !== id);
            saveEvents();
            renderEvents();
            updateDashboard();
        }, 300);
    };

    function createEventCard(event) {
        const card = document.createElement("div");
        card.classList.add("event-card");
        if (event.completed) card.classList.add("completed");
        card.setAttribute("data-id", event.id);
        
        const catDetails = categoryMap[event.category] || categoryMap['doctor'];
        const reminderBlockStr = (!event.completed) ? getRelativeTimeStr(event.date, event.time) : null;
        
        let urgentHtml = "";
        if (reminderBlockStr) {
            urgentHtml = `<span class="tag ${reminderBlockStr.urgent ? 'tag-urgent' : ''}">
                          <i class="fa-regular fa-clock"></i> ${reminderBlockStr.text}</span>`;
        }

        let notesHtml = event.notes ? `<div class="event-notes">${event.notes}</div>` : '';

        card.innerHTML = `
            <div class="event-header">
                <div class="event-basic-info">
                    <div class="event-name">${event.name}</div>
                    <div class="event-datetime">
                        <span><i class="fa-regular fa-calendar"></i> ${formatDate(event.date)}</span>
                        <span><i class="fa-regular fa-clock"></i> ${formatTime(event.time)}</span>
                    </div>
                </div>
                <div class="event-actions">
                    <button class="action-btn complete-btn" aria-label="Mark Complete" onclick="toggleComplete('${event.id}')">
                        <i class="fa-solid ${event.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
                    </button>
                    <button class="action-btn delete-btn" aria-label="Delete Event" onclick="deleteEvent('${event.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
            ${notesHtml}
            <div class="event-tags-container">
                <span class="tag ${catDetails.class}"><i class="fa-solid ${catDetails.icon}"></i> ${catDetails.label}</span>
                ${urgentHtml}
            </div>
        `;
        return card;
    }

    function renderEvents() {
        eventsContainer.innerHTML = '';

        if (events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <img src="https://cdni.iconscout.com/illustration/premium/thumb/medical-report-4458852-3694035.png?f=webp" alt="Empty schedule" class="empty-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC42KSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGxpbmUgeDE9IjE2IiB5MT0iMiIgeDI9IjE2IiB5Mj0iNiI+PC9saW5lPjxsaW5lIHgxPSI4IiB5MT0iMiIgeDI9IjgiIHkyPSI2Ij48L2xpbmU+PGxpbmUgeDE9IjMiIHkxPSIxMCIgeDI9IjIxIiB5Mj0iMTAiPjwvbGluZT48L3N2Zz4='">
                    <p>Your health schedule is clear. Add an event to start improving your routine!</p>
                </div>
            `;
            return;
        }

        events.forEach((event) => {
            eventsContainer.appendChild(createEventCard(event));
        });
    }

    // Initial render
    sortEvents();
    updateDashboard();
    renderEvents();
    
    // Auto-refresh reminders every minute
    setInterval(() => {
        renderEvents();
    }, 60000);
});
