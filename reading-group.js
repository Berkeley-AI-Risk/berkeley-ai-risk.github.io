const readingGroupSessions = [
    {
        id: 1,
        paperTitle: "Two divergent views on where we are heading",
        authors: "",
        sessionDate: "2025-06-03",
        sessionTime: "13:00",
        sessionLocation: "Barker 101",
        sessionLink: "",
        paperLink: "",
        description: "Readings: Chapters 1-7 of <a href='https://keepthefuturehuman.ai/essay/docs' target='_blank' rel='noopener noreferrer'>Keep The Future Human</a>, by Anthony Aguirre; Parts I-III of <a href='https://knightcolumbia.org/content/ai-as-normal-technology' target='_blank' rel='noopener noreferrer'>AI as Normal Technology</a>, by Arvind Narayanan and Sayash Kapoor",
        presenter: "Wes Holliday"
    },
    {
        id: 2,
        paperTitle: "Even if near-term risks are averted, will AI gradually disempower humanity?",
        authors: "",
        sessionDate: "2025-06-17",
        sessionTime: "13:00",
        sessionLocation: "Davis 534",
        sessionLink: "",
        paperLink: "",
        description: "Reading: <a href='https://gradual-disempowerment.ai' target='_blank' rel='noopener noreferrer'>Gradual Disempowerment</a> by Jan Kulveit et al.",
        presenter: "Will Fithian"
    },
    {
        id: 3,
        paperTitle: "How long will it be before AI is very powerful?",
        authors: "",
        sessionDate: "2025-07-01",
        sessionTime: "13:00",
        sessionLocation: "Davis 534",
        sessionLink: "",
        paperLink: "",
        description: "Primary readings: <a href='https://benjamintodd.substack.com/p/the-case-for-agi-by-2030' target='_blank' rel='noopener noreferrer'>The case for AGI by 2030</a> by Ben Todd; <a href='https://thegradient.pub/why-transformative-artificial-intelligence-is-really-really-hard-to-achieve/' target='_blank' rel='noopener noreferrer'>Why transformative artificial intelligence is really, really hard to achieve</a> by Arjun Ramani and Zhengdong Wang",
        presenter: "Adam Lesnikowski"
    },
    {
        id: 4,
        paperTitle: "Alignment faking",
        authors: "",
        sessionDate: "2025-07-15",
        sessionTime: "13:00",
        sessionLocation: "Davis 534",
        sessionLink: "",
        paperLink: "",
        description: "Primary readings: <a href='https://www.anthropic.com/research/alignment-faking' target='_blank' rel='noopener noreferrer'>Alignment faking in large language models</a> by Greenblatt et al.; <a href='https://www2.csudh.edu/ccauthen/576f12/frankfurt__harry_-_on_bullshit.pdf' target='_blank' rel='noopener noreferrer'>On Bullshit</a> by Harry Frankfurt",
        presenter: "Arpita Roy, Will Fithian"
    },
    {
        id: 5,
        paperTitle: "Strategic Implications of AI-Military Integration",
        authors: "",
        sessionDate: "2025-07-29",
        sessionTime: "13:00",
        sessionLocation: "Evans 334",
        sessionLink: "",
        paperLink: "",
        description: "Primary reading: Function, Not Fiction: Rethinking AI-Military Integration",
        presenter: "Andrew Reddie"
    },
    {
        id: 6,
        paperTitle: "Autonomous Weapons Systems",
        authors: "",
        sessionDate: "2025-08-12",
        sessionTime: "13:00",
        sessionLocation: "Evans 334",
        sessionLink: "",
        paperLink: "",
        description: "Primary reading: AI in the Military",
        presenter: "Chris Hoofnagle"
    }
];

let sessions = [...readingGroupSessions];

const scheduleGrid = document.getElementById('schedule-grid');

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    renderSchedule();
});

function setupEventListeners() {
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
    const sortedSessions = sessions.sort((a, b) => {
        return new Date(a.sessionDate) - new Date(b.sessionDate);
    });
    
    scheduleGrid.innerHTML = sortedSessions.map(session => createSessionHTML(session)).join('');
}

function createSessionHTML(session) {
    const sessionDate = new Date(session.sessionDate);
    const now = new Date();
    const isPast = sessionDate < now;
    
    const formattedDate = sessionDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const formattedTime = formatTime(session.sessionTime);
    
    return `
        <div class="schedule-item ${isPast ? 'past' : ''}">
            <div class="schedule-header">
                <div class="speaker-info">
                    <h3>${escapeHtml(session.paperTitle)}</h3>
                    ${session.authors ? `<div class="speaker-affiliation">${escapeHtml(session.authors)}</div>` : ''}
                </div>
                <div class="event-date">
                    <div>${formattedDate}</div>
                    <div class="event-time">${formattedTime}</div>
                </div>
            </div>
            
            ${session.description ? `<div class="talk-abstract">${session.description}</div>` : ''}
            
            <div class="event-details">
                ${session.sessionLocation ? `<div><strong>Location:</strong> ${escapeHtml(session.sessionLocation)}</div>` : ''}
                ${session.presenter ? `<div><strong>Presenter:</strong> ${escapeHtml(session.presenter)}</div>` : ''}
                ${session.paperLink ? `<div><a href="${escapeHtml(session.paperLink)}" class="event-link" target="_blank" rel="noopener noreferrer">Read Paper</a></div>` : ''}
                ${session.sessionLink ? `<div><a href="${escapeHtml(session.sessionLink)}" class="event-link" target="_blank" rel="noopener noreferrer">Join via Zoom</a></div>` : ''}
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
