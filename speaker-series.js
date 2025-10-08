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
        eventLink: "",
        videoUrl: "https://www.youtube.com/watch?v=NX2YROCIJNQ&list=PLrFSj_PCtUNWCzrP1DHptbgVd_H8fDy9c&index=1",
        slidesUrl: "slides/krueger-slides.pdf"
    },
    {
        id: 2,
        speakerName: "Nikola Jurkovic",
        speakerAffiliation: "METR",
        speakerWebsite: "https://nikolajurkovic.com",
        talkTitle: "How to check if an AI model is safe? Lessons from evaluating frontier AI",
        talkAbstract: "LLMs are quickly learning capabilities needed to increase catastrophic risks. When a model pushes the frontier of capabilities, how can we know whether it's safe or not? In this talk, I will go into METR's recent work on evaluating frontier AI models, using METR's evaluation of GPT-5 as a case study. I will talk about measuring AI capabilities over time, creating safety cases for frontier AI models, and what AI evaluations and safety assessments might look like in the future as we approach AGI.",
        eventDate: "2025-09-23",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: "",
        videoUrl: "https://www.youtube.com/watch?v=oiM5ZUg22UI&list=PLrFSj_PCtUNWCzrP1DHptbgVd_H8fDy9c&index=1",
        slidesUrl: "slides/jurkovic-slides.pdf"
    },
    {
        id: 3,
        speakerName: "Bharat Chandar",
        speakerAffiliation: "Stanford University",
        speakerWebsite: "https://bharatchandar.com",
        talkTitle: "Canaries in the Coal Mine? Six Facts about the Recent Employment Effects of Artificial Intelligence",
        talkAbstract: "This paper examines changes in the labor market for occupations exposed to generative artificial intelligence using high-frequency administrative data from the largest payroll software provider in the United States. We present six facts that characterize these shifts. We find that since the widespread adoption of generative AI, early-career workers (ages 22-25) in the most AI-exposed occupations have experienced a 13 percent relative decline in employment even after controlling for firm-level shocks. In contrast, employment for workers in less exposed fields and more experienced workers in the same occupations has remained stable or continued to grow. We also find that adjustments occur primarily through employment rather than compensation. Furthermore, employment declines are concentrated in occupations where AI is more likely to automate, rather than augment, human labor. Our results are robust to alternative explanations, such as excluding technology-related firms and excluding occupations amenable to remote work. These six facts provide early, large-scale evidence consistent with the hypothesis that the AI revolution is beginning to have a significant and disproportionate impact on entry-level workers in the American labor market.",
        eventDate: "2025-10-7",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: "",
        videoUrl: "",
        slidesUrl: ""
    },
    {
        id: 4,
        speakerName: "Stuart Russell",
        speakerAffiliation: "UC Berkeley",
        speakerWebsite: "https://people.eecs.berkeley.edu/~russell/",
        talkTitle: "AI: What Is To Be Done?",
        talkAbstract: "In 1951, Alan Turing predicted the eventual loss of human control over machines that exceed human capabilities. I will argue that Turing was right to express concern but wrong to think that doom is inevitable. There are technical and regulatory directions that ensure human flourishing, if we choose to pursue them.",
        eventDate: "2025-10-21",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: "",
        videoUrl: "",
        slidesUrl: ""
    },
    {
        id: 5,
        speakerName: "Holly Elmore",
        speakerAffiliation: "PauseAI US",
        speakerWebsite: "https://hollyelmore.substack.com",
        talkTitle: "The deep worldview and theory of change behind PauseAI, from a founder",
        talkAbstract: "PauseAI co-founder and Dr. of Evolutionary Biology Holly Elmore lays out her deep worldview on genetic conflict, human society, and social change and explains how that is cashed out in PauseAI's theory of change. PauseAI is for anyone who wants to pause AI development (and pledges nonviolence!). But PauseAI was organized according to the idea that the real AI danger isn't simply a technical issue awaiting a bugfix. The problem is that we are developing machines of arbitrary intelligence. Arbitrary intelligence is arbitrary power, and the existence of such power will disrupt many societal equilibria, some we anticipate and who knows how many that we may not even be aware of. It may take many years to bring human society to the point where we can coexist comfortably with advanced AI, or human society may be fundamentally incompatible with superhuman AI. Whatever we do about advancing AI as a society must take all of these possibilities into account.",
        eventDate: "2025-11-04",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: "",
        videoUrl: "",
        slidesUrl: ""
    },
       {
        id: 6,
        speakerName: "Jessica Newman",
        speakerAffiliation: "UC Berkeley",
        speakerWebsite: "https://cltc.berkeley.edu/jessica-newman/",
        talkTitle: "Can we Manage the Risks of Frontier AI?",
        talkAbstract: "The AI governance and risk management landscape has evolved with, for example, the release of The General-Purpose AI Code of Practice and at least a dozen frontier AI safety frameworks from leading AI companies. I will compare these developments to the shifting AI risk landscape and highlight key priorities to help developers, policymakers, and researchers stay a step ahead in order to realize AI's benefits — and prevent its greatest harms.",
        eventDate: "2025-11-18",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: "",
        videoUrl: "",
        slidesUrl: ""
    },
       {
        id: 7,
        speakerName: "Deborah Raji",
        speakerAffiliation: "UC Berkeley",
        speakerWebsite: "https://rajiinio.github.io",
        talkTitle: "Sociotechnical dimensions of AI Safety",
        talkAbstract: "",
        eventDate: "2025-12-02",
        eventTime: "16:30",
        eventLocation: "621 Sutardja Dai Hall",
        eventLink: "",
        videoUrl: "",
        slidesUrl: ""
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
                ${event.videoUrl ? `<div><a href="${escapeHtml(event.videoUrl)}" class="event-link" target="_blank" rel="noopener noreferrer">Watch Video</a></div>` : ''}
                ${event.slidesUrl ? `<div><a href="${escapeHtml(event.slidesUrl)}" class="event-link" target="_blank" rel="noopener noreferrer">View Slides</a></div>` : ''}
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
