const speakerEvents = [
    {
        id: 1,
        speakerName: "David Krueger",
        speakerAffiliation: "University of Montreal",
        speakerWebsite: "https://davidscottkrueger.com",
        talkTitle: "Everything You Always Wanted to Know About AI Safety (But Were Afraid to Ask)",
        talkAbstract: "I'm going to give a whirlwind tour of AI Safety as a set of concerns, concepts, and communities. I'll talk about the history of AI Safety and my personal history in the field, and how I and others in AI Safety see the state of play. I'll touch on some of my past work, including on Gradual Disempowerment -- a risk that's been historically neglected within AI Safety. I'll also talk about how I think academics across disciplines can (and should) contribute to shaping the future of AI. And I'll describe my current work on raising public awareness of AI risk.",
        eventDate: "2025-09-09",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: ""
    },
    {
        id: 2,
        speakerName: "Nikola Jurkovic",
        speakerAffiliation: "METR",
        speakerWebsite: "https://nikolajurkovic.com",
        talkTitle: "TBA",
        talkAbstract: "",
        eventDate: "2025-09-23",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: ""
    },
    {
        id: 3,
        speakerName: "Stuart Russell",
        speakerAffiliation: "UC Berkeley",
        speakerWebsite: "https://people.eecs.berkeley.edu/~russell/",
        talkTitle: "AI: What Is To Be Done?",
        talkAbstract: "In 1951, Alan Turing predicted the eventual loss of human control over machines that exceed human capabilities. I will argue that Turing was right to express concern but wrong to think that doom is inevitable. There are technical and regulatory directions that ensure human flourishing, if we choose to pursue them.",
        eventDate: "2025-10-21",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: ""
    },
    {
        id: 4,
        speakerName: "Holly Elmore",
        speakerAffiliation: "PauseAI US",
        speakerWebsite: "https://hollyelmore.substack.com",
        talkTitle: "TBA",
        talkAbstract: "",
        eventDate: "2025-11-04",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: ""
    }
];

let events = [...speakerEvents];
let currentFilter = 'upcoming'; // Default to upcoming events

const scheduleGrid = document.getElementById('schedule-grid');
const filterButtons = document.querySelectorAll('.filter-btn');

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    renderSchedule();
});

function setupEventListeners() {
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.dataset.filter;
            renderSchedule();
        });
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function renderSchedule() {
    const filteredEvents = filterEvents();
    
    if (filteredEvents.length === 0) {
        scheduleGrid.innerHTML = '<p class="no-events">No events found for the selected filter.</p>';
        return;
    }

    scheduleGrid.innerHTML = filteredEvents.map(event => createEventHTML(event)).join('');
}

function filterEvents() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return events.filter(event => {
        switch (currentFilter) {
            case 'upcoming':
                return event.eventDate >= today;
            case 'past':
                return event.eventDate < today;
            default:
                return true;
        }
    }).sort((a, b) => {
        return new Date(a.eventDate) - new Date(b.eventDate);
    });
}

function createEventHTML(event) {
    const [year, month, day] = event.eventDate.split('-');
    const eventDate = new Date(year, month - 1, day); // month is 0-indexed
    const now = new Date();
    const isPast = eventDate < now;
    
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const formattedTime = formatTime(event.eventTime);
    
    return `
        <div class="schedule-item ${isPast ? 'past' : ''}">
            <div class="schedule-header">
                <div class="speaker-info">
                    <h3>${event.speakerWebsite ? `<a href="${escapeHtml(event.speakerWebsite)}" target="_blank" rel="noopener noreferrer" class="speaker-link">${escapeHtml(event.speakerName)}</a>` : escapeHtml(event.speakerName)}</h3>
                    ${event.speakerAffiliation ? `<div class="speaker-affiliation">${escapeHtml(event.speakerAffiliation)}</div>` : ''}
                </div>
                <div class="event-date">
                    <div>${formattedDate}</div>
                    <div class="event-time">${formattedTime}</div>
                </div>
            </div>
            
            <div class="talk-title">${escapeHtml(event.talkTitle)}</div>
            
            ${event.talkAbstract ? `<div class="talk-abstract">${escapeHtml(event.talkAbstract)}</div>` : ''}
            
            <div class="event-details">
                ${event.eventLocation ? `<div><strong>Location:</strong> ${escapeHtml(event.eventLocation)}</div>` : ''}
                ${event.eventLink ? `<div><a href="${escapeHtml(event.eventLink)}" class="event-link" target="_blank" rel="noopener noreferrer">Join via Zoom</a></div>` : ''}
            </div>
        </div>
    `;
}

function formatTime(time24) {
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':');
    const hour12 = hours % 12 || 12;
    const ampm = hours < 12 ? 'AM' : 'PM';
    
    return `${hour12}:${minutes} ${ampm}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
