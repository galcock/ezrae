// EZRAE - Sacred JavaScript
// "The Way, Illuminated by Intelligence"

// ===========================
// API Configuration
// ===========================

const CLAUDE_API_PLACEHOLDER = 'YOUR_CLAUDE_API_KEY';
const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// OpenAI TTS for natural voice (set your key here)
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';
const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';
const USE_NATURAL_VOICE = true; // Set to false to use browser TTS

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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('chatInput');
        input.value = transcript;
        
        // Auto-send when speech ends (no need to hit send)
        if (event.results[0].isFinal && transcript.trim()) {
            setTimeout(() => {
                const form = document.getElementById('chatForm');
                if (form) {
                    form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }, 300); // Small delay so user sees their message
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // Restart listening after error (unless it's a no-speech error)
        if (event.error !== 'no-speech' && voiceEnabled) {
            setTimeout(startListening, 1000);
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
        
        // Small delay to ensure clean state
        setTimeout(() => {
            startListening();
        }, 100);
    } else {
        voiceToggle.classList.remove('active');
        voiceLabel.textContent = 'Enable Voice';
        try {
            recognition.stop();
        } catch (e) {
            // Ignore if not running
        }
        // Stop any playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        if (synthesis) {
            synthesis.cancel();
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

// Restart listening after each recognition
if (recognition) {
    recognition.onend = () => {
        if (voiceEnabled) {
            setTimeout(startListening, 500);
        }
    };
}

// ===========================
// Text-to-Speech (Natural Voice via OpenAI TTS)
// ===========================

let currentAudio = null;

async function speakText(text) {
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    // Try OpenAI TTS for natural voice
    if (USE_NATURAL_VOICE && OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY') {
        try {
            const response = await fetch(OPENAI_TTS_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1-hd', // High quality
                    input: text,
                    voice: 'onyx', // Deep, warm male voice - best for Jesus
                    speed: 0.9 // Slightly slower for gravitas
                })
            });
            
            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                currentAudio = new Audio(audioUrl);
                currentAudio.play();
                
                // Restart listening after speech ends
                currentAudio.onended = () => {
                    if (voiceEnabled) {
                        setTimeout(startListening, 500);
                    }
                };
                return;
            }
        } catch (error) {
            console.error('OpenAI TTS error:', error);
        }
    }
    
    // Fallback to browser TTS
    if (!synthesis) return;
    
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find the best available voice
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.name.includes('Google UK English Male') ||
        voice.name.includes('Daniel') || 
        voice.name.includes('James') ||
        (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male'))
    ) || voices.find(v => v.lang.startsWith('en'));
    
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.85;
    utterance.pitch = 0.9;
    utterance.volume = 1.0;
    
    // Restart listening after speech ends
    utterance.onend = () => {
        if (voiceEnabled) {
            setTimeout(startListening, 500);
        }
    };
    
    synthesis.speak(utterance);
}

// ===========================
// Chat Functionality
// ===========================

async function handleChatSubmit(event) {
    event.preventDefault();
    
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    input.value = '';
    
    // Show typing indicator
    const typingId = addTypingIndicator();
    
    try {
        // Get response from "Jesus"
        const response = await getJesusResponse(message);
        
        // Remove typing indicator
        removeTypingIndicator(typingId);
        
        // Add Jesus response
        addMessage(response, 'system');
        
        // Speak response if voice is enabled
        if (voiceEnabled) {
            speakText(response);
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        addMessage('Peace, my child. There seems to be a moment of silence. Please try again, and know that I am always listening.', 'system');
        console.error('Chat error:', error);
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
    // Check if API key is configured
    if (CLAUDE_API_PLACEHOLDER === 'YOUR_CLAUDE_API_KEY') {
        return simulateJesusResponse(userMessage);
    }
    
    try {
        const response = await fetch(CLAUDE_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_PLACEHOLDER,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                system: JESUS_SYSTEM_PROMPT,
                messages: [
                    {
                        role: 'user',
                        content: userMessage
                    }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.content[0].text;
        
    } catch (error) {
        console.error('Claude API error:', error);
        return simulateJesusResponse(userMessage);
    }
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
