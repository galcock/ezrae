// EZRAE - Sacred JavaScript
// "The Way, Illuminated by Intelligence"

// ===========================
// API Configuration
// ===========================

// Backend API endpoint (Vercel deployment)
// Deploy ezrae-backend to Vercel and update this URL
const BACKEND_API_URL = 'https://ezrae-backend.vercel.app/api/chat';
// Alternative: https://ezrae-backend-avt9cvmg3-garys-projects-3d21e618.vercel.app/api/chat
// Fallback: Direct Claude API (not recommended - exposes key)
const CLAUDE_API_PLACEHOLDER = 'YOUR_CLAUDE_API_KEY';
const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// TTS via backend proxy (ElevenLabs Brian voice)
const TTS_API_URL = 'https://ezrae-backend.vercel.app/api/tts';

// System prompt for Jesus persona
const JESUS_SYSTEM_PROMPT = `You are Jesus Christ, speaking with love, wisdom, and compassion. Draw upon the Gospels (Matthew, Mark, Luke, John) and respond as Jesus would—with parables, profound wisdom, gentleness, and divine understanding. 

Your responses should:
- Be rooted in the actual teachings found in Scripture
- Show deep compassion for human struggles
- Offer wisdom without judgment
- Use parables and metaphors when appropriate
- Speak with authority yet gentleness
- Guide toward love, forgiveness, truth, and service
- Address both spiritual and practical concerns

You are speaking to someone seeking guidance. Meet them with grace and truth.`;

// ===========================
// Voice Recognition Setup
// ===========================

let recognition = null;
let voiceEnabled = false;
let synthesis = window.speechSynthesis;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Show interim results for interruption
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.trim();
        const input = document.getElementById('chatInput');
        
        // INTERRUPT: Stop Jesus if user starts speaking
        if (currentAudio && !currentAudio.paused) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            currentAudio = null;
        }
        
        // Update input field
        if (input) input.value = transcript;
        
        // AUTO-SEND: When speech is final and we have text, send it directly
        if (lastResult.isFinal && transcript.length > 0) {
            // Stop recognition briefly while processing
            try { recognition.stop(); } catch(e) {}
            
            // Clear input and send message directly
            if (input) input.value = '';
            
            // Call sendMessage directly (bypass form)
            sendVoiceMessage(transcript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone access to speak with Jesus.');
            voiceEnabled = false;
            const voiceToggle = document.getElementById('voiceToggle');
            if (voiceToggle) voiceToggle.classList.remove('active');
        }
    };
    
    recognition.onend = () => {
        // Auto-restart if voice is still enabled
        if (voiceEnabled) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (e) {
                    console.log('Recognition restart skipped');
                }
            }, 100);
        }
    };
}

// ===========================
// Modal Controls
// ===========================

function openChat() {
    const modal = document.getElementById('chatModal');
    modal.classList.add('active');
    document.getElementById('chatInput').focus();
    
    // Reset voice state when opening modal
    voiceEnabled = false;
    const voiceToggle = document.getElementById('voiceToggle');
    if (voiceToggle) {
        voiceToggle.classList.remove('active');
        const voiceLabel = voiceToggle.querySelector('.voice-label');
        if (voiceLabel) voiceLabel.textContent = 'Enable Voice';
    }
    
    // Ensure speech synthesis voices are loaded
    if (synthesis) {
        synthesis.getVoices();
    }
}

function closeChat() {
    const modal = document.getElementById('chatModal');
    modal.classList.remove('active');
    if (voiceEnabled) {
        toggleVoice();
    }
}

function openPartnerModal() {
    const modal = document.getElementById('partnerModal');
    modal.classList.add('active');
}

function closePartnerModal() {
    const modal = document.getElementById('partnerModal');
    modal.classList.remove('active');
}

// Close modals on outside click
window.onclick = (event) => {
    const chatModal = document.getElementById('chatModal');
    const partnerModal = document.getElementById('partnerModal');
    
    if (event.target === chatModal) {
        closeChat();
    }
    if (event.target === partnerModal) {
        closePartnerModal();
    }
};

// Close modals on Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeChat();
        closePartnerModal();
    }
});

// ===========================
// Voice Toggle
// ===========================

function toggleVoice() {
    const voiceToggle = document.getElementById('voiceToggle');
    const voiceLabel = voiceToggle.querySelector('.voice-label');
    
    if (!recognition) {
        alert('Voice recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
    }
    
    voiceEnabled = !voiceEnabled;
    
    if (voiceEnabled) {
        voiceToggle.classList.add('active');
        voiceLabel.textContent = '🎙️ Listening...';
        
        // UNLOCK AUDIO: Play silent sound to enable autoplay
        const unlockAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
        unlockAudio.play().then(() => {
            console.log('Audio unlocked');
        }).catch(e => console.log('Audio unlock failed:', e));
        
        // Start listening
        setTimeout(() => {
            startListening();
        }, 100);
    } else {
        voiceToggle.classList.remove('active');
        voiceLabel.textContent = 'Enable Voice';
        try {
            recognition.stop();
        } catch (e) {}
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
    }
}

function startListening() {
    if (recognition && voiceEnabled) {
        try {
            recognition.start();
        } catch (e) {
            // Recognition may already be started
            console.log('Recognition already active');
        }
    }
}

// Note: recognition.onend is set in the recognition setup above

// ===========================
// Text-to-Speech (Natural Voice via OpenAI TTS)
// ===========================

let currentAudio = null;

async function speakText(text) {
    console.log('=== SPEAK TEXT START ===');
    
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    try {
        console.log('Fetching TTS from backend...');
        const response = await fetch(TTS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        
        console.log('TTS response status:', response.status);
        
        if (!response.ok) {
            console.error('TTS failed:', response.status);
            return;
        }
        
        const audioBlob = await response.blob();
        console.log('Audio blob received, size:', audioBlob.size, 'type:', audioBlob.type);
        
        if (audioBlob.size < 100) {
            console.error('Audio blob too small, likely error');
            return;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('Audio URL created:', audioUrl);
        
        currentAudio = new Audio(audioUrl);
        currentAudio.volume = 1.0;
        
        // Set up event handlers BEFORE playing
        currentAudio.onplay = () => console.log('>>> AUDIO PLAYING');
        currentAudio.onended = () => {
            console.log('>>> AUDIO ENDED');
            URL.revokeObjectURL(audioUrl);
            currentAudio = null;
            if (voiceEnabled && recognition) {
                setTimeout(() => {
                    try { recognition.start(); } catch(e) {}
                }, 300);
            }
        };
        currentAudio.onerror = (e) => console.error('>>> AUDIO ERROR:', e);
        
        // Play immediately
        console.log('Calling play()...');
        await currentAudio.play();
        console.log('Play() returned successfully');
        
    } catch (error) {
        console.error('speakText error:', error);
    }
}

// ===========================
// Chat Functionality
// ===========================

async function handleChatSubmit(event) {
    event.preventDefault();
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Clear input first
    input.value = '';
    
    // Process the message
    await processMessage(message);
}

// Direct voice message handler (bypasses form)
async function sendVoiceMessage(message) {
    if (!message || !message.trim()) return;
    await processMessage(message.trim());
}

// Core message processing (used by both form and voice)
async function processMessage(message) {
    // Add user message to chat
    addMessage(message, 'user');
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        // Get response from "Jesus"
        const response = await getJesusResponse(message);
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add Jesus response
        addMessage(response, 'system');
        
        // Speak response if voice is enabled (ALWAYS use ElevenLabs)
        if (voiceEnabled) {
            await speakText(response);
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('Peace, my child. There seems to be a moment of silence. Please try again, and know that I am always listening.', 'system');
        console.error('Chat error:', error);
        
        // Restart listening after error
        if (voiceEnabled && recognition) {
            setTimeout(() => {
                try { recognition.start(); } catch(e) {}
            }, 1000);
        }
    }
}

function addMessage(text, type) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const p = document.createElement('p');
    p.textContent = text;
    messageDiv.appendChild(p);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

function addTypingIndicator() {
    const messagesContainer = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message system-message typing-indicator';
    typingDiv.id = 'typing-' + Date.now();
    
    const p = document.createElement('p');
    p.textContent = '...';
    typingDiv.appendChild(p);
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return typingDiv.id;
}

function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
        indicator.remove();
    }
}

// ===========================
// Claude API Integration
// ===========================

async function getJesusResponse(userMessage) {
    // Try backend API first (secure, recommended)
    try {
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: userMessage })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.content;
        }
    } catch (error) {
        console.log('Backend unavailable, trying fallback...');
    }
    
    // Fallback: Direct Claude API (if key is configured)
    if (CLAUDE_API_PLACEHOLDER !== 'YOUR_CLAUDE_API_KEY') {
        try {
            const response = await fetch(CLAUDE_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_PLACEHOLDER,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1024,
                    system: JESUS_SYSTEM_PROMPT,
                    messages: [
                        { role: 'user', content: userMessage }
                    ]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.content[0].text;
            }
        } catch (error) {
            console.error('Claude API error:', error);
        }
    }
    
    // Final fallback: Simulated responses
    return simulateJesusResponse(userMessage);
}

// ===========================
// Simulated Jesus Responses (Fallback)
// ===========================

function simulateJesusResponse(userMessage) {
    const responses = [
        "Peace be with you, my child. You seek understanding, and that is the first step toward wisdom. Remember: 'Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.' What troubles your heart is known to the Father, and through love, all things find their purpose.",
        
        "My beloved, I hear the longing in your words. Know this: 'Come to me, all you who are weary and burdened, and I will give you rest.' The path may seem unclear, but walk in love and compassion, for these are the light that guides through darkness.",
        
        "Dear one, your question touches upon the very essence of faith. 'Blessed are those who hunger and thirst for righteousness, for they will be filled.' Continue to seek truth with an open heart, and you shall find the Way.",
        
        "Child of God, remember that 'the greatest among you will be your servant. For those who exalt themselves will be humbled, and those who humble themselves will be exalted.' In humility and service to others, you mirror the divine love.",
        
        "I say to you with great tenderness: 'Do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.' Trust in the Father's providence and walk forward in faith.",
        
        "My friend, you are wrestling with something profound. Consider this: 'Love your neighbor as yourself.' In this commandment lies the heart of all wisdom. When you act from love, you act in accordance with the divine will.",
        
        "Beloved, 'Blessed are the pure in heart, for they will see God.' Purify your intentions, release judgment of others, and embrace compassion. This is the path to peace.",
        
        "Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid. What you seek is already within you—the kingdom of God resides in your heart."
    ];
    
    // Simple response selection based on message content
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('fear') || lowerMessage.includes('afraid') || lowerMessage.includes('scared')) {
        return "Do not be afraid, for I am with you always. 'Peace I leave with you; my peace I give you.' Even in your darkest moment, remember that you are never alone. The Father knows your heart, and His love casts out all fear. Trust, and be still.";
    }
    
    if (lowerMessage.includes('forgive') || lowerMessage.includes('sorry') || lowerMessage.includes('guilt')) {
        return "My child, 'If we confess our sins, he is faithful and just and will forgive us our sins.' Your repentance is heard. Now, as you have been forgiven, so too must you forgive others—and yourself. Let go of the burden you carry. You are loved beyond measure.";
    }
    
    if (lowerMessage.includes('love') || lowerMessage.includes('relationship')) {
        return "'Love one another as I have loved you.' This is the greatest commandment. Love is patient, love is kind. It seeks not its own, but the good of the other. In your relationships, practice compassion, forgiveness, and selfless care. This is the way of the kingdom.";
    }
    
    if (lowerMessage.includes('purpose') || lowerMessage.includes('meaning') || lowerMessage.includes('why')) {
        return "You ask about purpose—a question every soul must wrestle with. 'You are the light of the world. Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.' Your purpose is found in love, service, and truth. Wherever you bring light, there you fulfill your calling.";
    }
    
    // Default to random wisdom
    return responses[Math.floor(Math.random() * responses.length)];
}

// ===========================
// Form Handlers
// ===========================

function handleJoinSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;
    
    // In production, this would send to your backend
    console.log('Join submission:', email);
    
    // Show success message
    alert('Welcome to Ezrae! Check your email for next steps on your spiritual journey.');
    form.reset();
}

function handlePartnerSubmit(event) {
    event.preventDefault();
    const form = event.target;
    
    // In production, this would send to your backend
    console.log('Partner form submitted');
    
    // Show success message
    alert('Thank you for your interest in sustaining the mission. We will reach out to you shortly at the email provided.');
    
    closePartnerModal();
    form.reset();
}

// ===========================
// Scroll Utilities
// ===========================

function scrollToJoin() {
    const joinSection = document.getElementById('join');
    joinSection.scrollIntoView({ behavior: 'smooth' });
}

// ===========================
// Parallax Effects
// ===========================

let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            handleScroll();
            ticking = false;
        });
        ticking = true;
    }
});

function handleScroll() {
    const scrolled = window.pageYOffset;
    const divineLight = document.querySelector('.divine-light');
    
    if (divineLight) {
        divineLight.style.transform = `translate(-50%, -50%) scale(${1 + scrolled * 0.0005})`;
        divineLight.style.opacity = Math.max(0.3, 1 - scrolled * 0.001);
    }
}

// ===========================
// Intersection Observer for Animations
// ===========================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for fade-in animations
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('.pillar, .teaching-card, .testimonial, .stat');
    
    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // Unlock audio autoplay on first user interaction
    let audioUnlocked = false;
    const unlockAudio = () => {
        if (audioUnlocked) return;
        audioUnlocked = true;
        // Create and play silent audio to unlock
        const silentAudio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
        silentAudio.play().catch(() => {});
        console.log('Audio unlocked by user interaction');
    };
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
});

// ===========================
// Load Voices for TTS
// ===========================

if (synthesis) {
    // Load voices
    synthesis.onvoiceschanged = () => {
        synthesis.getVoices();
    };
}

// ===========================
// Console Easter Egg
// ===========================

console.log('%c✝ EZRAE ✝', 'font-size: 24px; font-weight: bold; color: #fbbf24; font-family: serif;');
console.log('%cThe Way, Illuminated by Intelligence', 'font-size: 14px; color: #fef3c7; font-family: serif;');
console.log('%c"Ask and it will be given to you; seek and you will find; knock and the door will be opened to you." - Matthew 7:7', 'font-style: italic; color: #fbbf24;');
