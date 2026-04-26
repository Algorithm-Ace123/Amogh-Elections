// filter.js
// Multi-layer client-side filter for Fire & Ice

// Will store DB-approved false positives loaded on start
let dynamicWhitelist = new Set();

// Fetch whitelist from server asynchronously
fetch('/api/whitelist')
    .then(res => res.json())
    .then(data => {
        if(Array.isArray(data)) {
            data.forEach(token => dynamicWhitelist.add(token.toLowerCase()));
        }
    })
    .catch(e => console.error("Failed to load whitelist"));

/**
 * Runs the 5-step filter on the given text.
 * @param {string} text - The input text from the form
 * @param {string} formType - "Feedback" or "Idea Box"
 * @returns {object} { passed: boolean, reason: string, tokens: array }
 */
window.runFilter = function(text, formType) {
    const originalText = text;
    text = text.trim();
    
    // Check 1: Empty or Too Short
    if (text.length < 10) {
        return { passed: false, reason: "Too Short", message: "Please write a more detailed message before submitting.", tokens: [] };
    }

    // Check 2: Spam Detection
    // Consecutive identical characters (>5)
    if (/(.)\1{5,}/.test(text)) {
        return { passed: false, reason: "Spam", message: "Your message appears to be spam. Please write a genuine submission.", tokens: [] };
    }
    
    // Repeated characters/words ratio (>40%)
    const charLen = text.replace(/\s+/g, '').length;
    const uniqueChars = new Set(text.replace(/\s+/g, '').toLowerCase().split('')).size;
    // Extremely simplistic repetitive character check for gibberish:
    if (uniqueChars < 5 && charLen > 15) {
        return { passed: false, reason: "Spam", message: "Your message appears to be spam. Please write a genuine submission.", tokens: [] };
    }

    // Check 3: Vernacular Detection
    // Tokenize by spaces and split common contractions if needed, but a simple split works well for ~20k words if stripped.
    const rawTokens = text.split(/[\s\n\t]+/).filter(t => t.length > 0);
    const nonEnglishTokens = [];
    
    for (const rawToken of rawTokens) {
        // Ignore single chars, numbers, pure punctuation
        if (/^[^a-zA-Z]+$/.test(rawToken) || rawToken.length <= 1) {
            continue;
        }

        // Handle common contractions e.g. "don't" -> ["don", "t"] 
        // For the sake of the english word list, we can just strip punctuation entirely.
        const cleanToken = rawToken.replace(/[^a-zA-Z]/g, '');
        if (cleanToken.length <= 1) continue;
        
        const isCapitalized = /^[A-Z][a-z]*/.test(cleanToken) && cleanToken === rawToken.replace(/[^a-zA-Z]/g, '');
        const lowerToken = cleanToken.toLowerCase();

        // If it's explicitly a Hinglish stopword, flag it immediately unless whitelisted
        if (HINGLISH_STOPWORDS.has(lowerToken) && !dynamicWhitelist.has(lowerToken)) {
            nonEnglishTokens.push(lowerToken);
            continue;
        }

        // Check against English word list and dynamic whitelist
        const isEnglish = ENGLISH_WORDS.has(lowerToken) || dynamicWhitelist.has(lowerToken);
        
        // If not English and not capitalized (proper noun heuristic), flag it
        if (!isEnglish && !isCapitalized) {
            nonEnglishTokens.push(lowerToken);
        }
    }

    if (nonEnglishTokens.length > 2) {
        // Log to server quietly before returning
        logRejection(formType, "Vernacular", originalText, nonEnglishTokens);
        return { 
            passed: false, 
            reason: "Vernacular", 
            message: "Please write your submission in English only. Words from other languages, even written in English letters, are not accepted.", 
            tokens: nonEnglishTokens 
        };
    }

    // Check 4: Hate Speech Detection
    const lowerText = text.toLowerCase();
    for (const slur of BLOCKLIST) {
        // Check for whole word match of the slur
        const regex = new RegExp(`\\b${slur}\\b`, 'i');
        if (regex.test(text)) {
            logRejection(formType, "Hate Speech", originalText, [slur]); // slur logged for admin reference
            return { 
                passed: false, 
                reason: "Hate Speech", 
                message: "Your message contains language that is not allowed on this platform. Please rewrite respectfully.", 
                tokens: [slur] 
            };
        }
    }

    // If there were 1 or 2 vernacular tokens, log them silently but PASS
    if (nonEnglishTokens.length > 0) {
        logRejection(formType, "Silent Flag", originalText, nonEnglishTokens);
    }

    // Check 5: Pass
    return { passed: true, reason: "Pass", message: "", tokens: [] };
};

/**
 * Sends rejection logs to the server
 */
function logRejection(formType, reason, originalText, tokens) {
    const truncated = originalText.substring(0, 30) + (originalText.length > 30 ? "..." : "");
    fetch('/api/filter_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            form_type: formType,
            reason: reason,
            flagged_tokens: tokens.join(', '),
            truncated_text: truncated
        })
    }).catch(e => console.error("Log failed")); // Silent fail
}
