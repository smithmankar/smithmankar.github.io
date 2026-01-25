/**
 * WhatsApp Chat Parser - Valentine's Day Data Analysis
 *
 * Usage: node parse-chat.js <path-to-chat-export.txt> <your-name> <partner-name>
 * Example: node parse-chat.js "./chat.txt" "Smith" "Her Name"
 *
 * Output: data/chat-stats.json
 */

const fs = require('fs');
const path = require('path');

// ============================================
// Configuration
// ============================================

const CONFIG = {
    // Words to exclude from word cloud (common words, articles, etc.)
    stopWords: new Set([
        // English stop words
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
        'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
        'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
        'his', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
        'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
        'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
        'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
        'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once', 'if',
        'because', 'although', 'though', 'while', 'until', 'unless', 'since',
        'about', 'after', 'before', 'between', 'into', 'through', 'during',
        'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
        'further', 'am', 'being', 'get', 'got', 'getting', 'go', 'going', 'gone',
        'went', 'come', 'coming', 'came', 'make', 'made', 'take', 'took', 'taken',
        'see', 'saw', 'seen', 'know', 'knew', 'known', 'think', 'thought',
        'say', 'said', 'tell', 'told', 'ask', 'asked', 'use', 'using',
        'like', 'well', 'back', 'even', 'still', 'way', 'want', 'give', 'gave',
        'first', 'last', 'long', 'great', 'little', 'own', 'old', 'right', 'big',
        'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important',
        'thing', 'things', 'ok', 'okay', 'yeah', 'yes', 'no', 'hey', 'hi', 'hello',
        'bye', 'thanks', 'thank', 'please', 'sorry', 'lol', 'haha', 'hehe',
        'oh', 'ah', 'um', 'uh', 'hmm', 'ya', 'na', 'ka', 'ki', 'ke', 'hai', 'ho',
        'kya', 'toh', 'bhi', 'nahi', 'tha', 'thi', 'haan', 'nhi', 'acha', 'accha',
        'media', 'omitted', 'image', 'video', 'audio', 'document', 'sticker',
        'deleted', 'message', 'missed', 'call', 'voice', 'gif',
        'http', 'https', 'www', 'com', 'org', 'net',
        // Timestamp artifacts
        'pm', 'am',
        // Contractions fragments
        'll', 've', 're', 'don', 'didn', 'doesn', 'won', 'isn', 'aren', 'wasn',
        'weren', 'hasn', 'haven', 'hadn', 'couldn', 'wouldn', 'shouldn', 'ain',
        // Common chat noise
        'gt', 'lt', 'amp', 'quot', 'nbsp'
    ]),

    // Names to exclude (will be populated dynamically)
    excludeNames: [],

    // Minimum word length to include
    minWordLength: 2,

    // Top N words for word cloud
    topWordsCount: 150,

    // Milestone keywords to search for (more specific patterns)
    lovePatterns: [
        /\bi\s*love\s*you\b/i,
        /\bi\s*love\s*u\b/i,
        /\blove\s*you\s*(?:so\s*much|too|more)\b/i,
        /\bily\b/i,
        /\bi\s*luv\s*(?:you|u)\b/i
    ],
    milestoneKeywords: {
        'miss': ['i miss you', 'miss you', 'miss u', 'missing you'],
        'baby': ['baby', 'babe', 'babu', 'jaan', 'jaanu'],
    }
};

// ============================================
// WhatsApp Message Parser
// ============================================

/**
 * Parse WhatsApp chat export file
 * Handles multiple date formats commonly used by WhatsApp
 */
function parseWhatsAppChat(content, yourName, partnerName) {
    const messages = [];
    const lines = content.split('\n');

    // WhatsApp date patterns (handles various formats)
    // Format: [DD/MM/YY, HH:MM:SS] or [DD/MM/YYYY, HH:MM:SS] or [M/D/YY, ...]
    const datePatterns = [
        /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]\s+([^:]+):\s*(.*)/,
        /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+-\s+([^:]+):\s*(.*)/,
        /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\s+([^:]+):\s*(.*)/,
    ];

    let currentMessage = null;

    for (const line of lines) {
        let matched = false;

        for (const pattern of datePatterns) {
            const match = line.match(pattern);
            if (match) {
                // Save previous message
                if (currentMessage) {
                    messages.push(currentMessage);
                }

                const [, dateStr, timeStr, sender, text] = match;
                const timestamp = parseDateTime(dateStr, timeStr);

                currentMessage = {
                    timestamp,
                    date: dateStr,
                    time: timeStr,
                    sender: sender.trim(),
                    text: text.trim(),
                    isYou: isYourMessage(sender.trim(), yourName),
                    isPartner: isPartnerMessage(sender.trim(), partnerName)
                };
                matched = true;
                break;
            }
        }

        // If no match, it's a continuation of the previous message
        if (!matched && currentMessage && line.trim()) {
            currentMessage.text += '\n' + line.trim();
        }
    }

    // Don't forget the last message
    if (currentMessage) {
        messages.push(currentMessage);
    }

    return messages;
}

/**
 * Parse date and time strings into a Date object
 */
function parseDateTime(dateStr, timeStr) {
    // Parse date (handle DD/MM/YY, DD/MM/YYYY, M/D/YY formats)
    const dateParts = dateStr.split('/');
    let day, month, year;

    // Determine format based on values
    if (parseInt(dateParts[0]) > 12) {
        // DD/MM/YY format
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]);
    } else if (parseInt(dateParts[1]) > 12) {
        // MM/DD/YY format (unlikely for India but handle it)
        month = parseInt(dateParts[0]) - 1;
        day = parseInt(dateParts[1]);
        year = parseInt(dateParts[2]);
    } else {
        // Ambiguous, assume DD/MM/YY (common in India)
        day = parseInt(dateParts[0]);
        month = parseInt(dateParts[1]) - 1;
        year = parseInt(dateParts[2]);
    }

    // Handle 2-digit year
    if (year < 100) {
        year += 2000;
    }

    // Parse time
    let hours = 0, minutes = 0, seconds = 0;
    const timeParts = timeStr.replace(/[APap][Mm]/, '').trim().split(':');
    hours = parseInt(timeParts[0]);
    minutes = parseInt(timeParts[1]);
    if (timeParts[2]) seconds = parseInt(timeParts[2]);

    // Handle AM/PM
    if (timeStr.toLowerCase().includes('pm') && hours < 12) {
        hours += 12;
    } else if (timeStr.toLowerCase().includes('am') && hours === 12) {
        hours = 0;
    }

    return new Date(year, month, day, hours, minutes, seconds);
}

function isYourMessage(sender, yourName) {
    return sender.toLowerCase().includes(yourName.toLowerCase());
}

function isPartnerMessage(sender, partnerName) {
    return sender.toLowerCase().includes(partnerName.toLowerCase());
}

// ============================================
// Analytics Functions
// ============================================

/**
 * Calculate basic statistics
 */
function calculateBasicStats(messages, relationshipStartDate) {
    const now = new Date();
    const startDate = new Date(relationshipStartDate);
    const daysTogether = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

    const yourMessages = messages.filter(m => m.isYou);
    const partnerMessages = messages.filter(m => m.isPartner);

    const totalWords = messages.reduce((sum, m) => sum + m.text.split(/\s+/).length, 0);
    const yourWords = yourMessages.reduce((sum, m) => sum + m.text.split(/\s+/).length, 0);
    const partnerWords = partnerMessages.reduce((sum, m) => sum + m.text.split(/\s+/).length, 0);

    // Calculate average messages per day
    const firstMessage = messages[0]?.timestamp || startDate;
    const lastMessage = messages[messages.length - 1]?.timestamp || now;
    const chatDays = Math.max(1, Math.floor((lastMessage - firstMessage) / (1000 * 60 * 60 * 24)));

    return {
        daysTogether,
        totalMessages: messages.length,
        yourMessages: yourMessages.length,
        partnerMessages: partnerMessages.length,
        totalWords,
        yourWords,
        partnerWords,
        averageMessagesPerDay: Math.round(messages.length / chatDays),
        chatStartDate: messages[0]?.date || 'Unknown',
        chatEndDate: messages[messages.length - 1]?.date || 'Unknown'
    };
}

/**
 * Calculate message frequency by month
 */
function calculateMonthlyFrequency(messages) {
    const monthly = {};
    const monthlyByPerson = { you: {}, partner: {} };

    for (const msg of messages) {
        const monthKey = `${msg.timestamp.getFullYear()}-${String(msg.timestamp.getMonth() + 1).padStart(2, '0')}`;

        monthly[monthKey] = (monthly[monthKey] || 0) + 1;

        if (msg.isYou) {
            monthlyByPerson.you[monthKey] = (monthlyByPerson.you[monthKey] || 0) + 1;
        } else if (msg.isPartner) {
            monthlyByPerson.partner[monthKey] = (monthlyByPerson.partner[monthKey] || 0) + 1;
        }
    }

    // Sort by date and convert to array
    const sortedMonths = Object.keys(monthly).sort();

    return {
        labels: sortedMonths.map(m => {
            const [year, month] = m.split('-');
            const date = new Date(year, parseInt(month) - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        }),
        total: sortedMonths.map(m => monthly[m]),
        you: sortedMonths.map(m => monthlyByPerson.you[m] || 0),
        partner: sortedMonths.map(m => monthlyByPerson.partner[m] || 0),
        raw: monthly
    };
}

/**
 * Calculate daily frequency (for a specific date range like the visit)
 */
function calculateDailyFrequency(messages, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daily = {};

    for (const msg of messages) {
        if (msg.timestamp >= start && msg.timestamp <= end) {
            const dayKey = msg.timestamp.toISOString().split('T')[0];
            daily[dayKey] = (daily[dayKey] || 0) + 1;
        }
    }

    return daily;
}

/**
 * Calculate hourly distribution (when do you talk most?)
 */
function calculateHourlyDistribution(messages) {
    const hourly = { total: Array(24).fill(0), you: Array(24).fill(0), partner: Array(24).fill(0) };

    for (const msg of messages) {
        const hour = msg.timestamp.getHours();
        hourly.total[hour]++;
        if (msg.isYou) hourly.you[hour]++;
        if (msg.isPartner) hourly.partner[hour]++;
    }

    return {
        labels: Array.from({ length: 24 }, (_, i) => {
            if (i === 0) return '12 AM';
            if (i === 12) return '12 PM';
            return i < 12 ? `${i} AM` : `${i - 12} PM`;
        }),
        total: hourly.total,
        you: hourly.you,
        partner: hourly.partner,
        peakHour: hourly.total.indexOf(Math.max(...hourly.total)),
        yourPeakHour: hourly.you.indexOf(Math.max(...hourly.you)),
        partnerPeakHour: hourly.partner.indexOf(Math.max(...hourly.partner))
    };
}

/**
 * Calculate day of week distribution
 */
function calculateDayOfWeekDistribution(messages) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const distribution = Array(7).fill(0);

    for (const msg of messages) {
        distribution[msg.timestamp.getDay()]++;
    }

    return {
        labels: days,
        values: distribution,
        mostActiveDay: days[distribution.indexOf(Math.max(...distribution))]
    };
}

/**
 * Extract word frequencies for word cloud
 */
function calculateWordFrequency(messages, excludeNames = []) {
    const wordCount = {};
    const emojiCount = {};

    // Build set of name parts to exclude
    const nameExclusions = new Set();
    for (const name of excludeNames) {
        const nameLower = name.toLowerCase();
        nameExclusions.add(nameLower);
        // Add name without special characters (ñ -> n, etc.)
        const nameNormalized = nameLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        nameExclusions.add(nameNormalized);

        // Add each part
        for (const part of nameLower.split(/\s+/)) {
            if (part.length > 1) {
                nameExclusions.add(part);
                // Normalized version
                const partNorm = part.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                nameExclusions.add(partNorm);
                // Version with non-word chars replaced with space then split
                const partWords = part.replace(/[^\w]/g, ' ').split(/\s+/).filter(w => w.length > 1);
                partWords.forEach(w => nameExclusions.add(w));
            }
        }
    }

    // Emoji regex
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;

    for (const msg of messages) {
        // Extract emojis
        const emojis = msg.text.match(emojiRegex) || [];
        for (const emoji of emojis) {
            emojiCount[emoji] = (emojiCount[emoji] || 0) + 1;
        }

        // Extract words
        const words = msg.text
            .toLowerCase()
            .replace(emojiRegex, ' ')
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word =>
                word.length >= CONFIG.minWordLength &&
                !CONFIG.stopWords.has(word) &&
                !nameExclusions.has(word) &&
                !/^\d+$/.test(word)
            );

        for (const word of words) {
            wordCount[word] = (wordCount[word] || 0) + 1;
        }
    }

    // Sort and get top words
    const sortedWords = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, CONFIG.topWordsCount);

    const sortedEmojis = Object.entries(emojiCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

    return {
        words: sortedWords.map(([word, count]) => ({ text: word, value: count })),
        emojis: sortedEmojis.map(([emoji, count]) => ({ emoji, count })),
        topWord: sortedWords[0]?.[0] || '',
        topEmoji: sortedEmojis[0]?.[0] || ''
    };
}

/**
 * Find milestones and special moments
 */
function findMilestones(messages) {
    const milestones = [];

    // First message
    if (messages.length > 0) {
        milestones.push({
            type: 'first_message',
            label: 'First Message',
            date: messages[0].date,
            timestamp: messages[0].timestamp.toISOString(),
            text: messages[0].text.substring(0, 100) + (messages[0].text.length > 100 ? '...' : '')
        });
    }

    // Find first "I love you" using regex patterns
    for (const msg of messages) {
        let found = false;
        for (const pattern of CONFIG.lovePatterns) {
            if (pattern.test(msg.text)) {
                milestones.push({
                    type: 'first_love',
                    label: 'First "I Love You"',
                    date: msg.date,
                    timestamp: msg.timestamp.toISOString(),
                    sender: msg.isYou ? 'you' : 'partner',
                    text: msg.text.substring(0, 100) + (msg.text.length > 100 ? '...' : '')
                });
                found = true;
                break;
            }
        }
        if (found) break;
    }

    // Longest conversation streak (days in a row with messages)
    let currentStreak = 1;
    let longestStreak = 1;
    let streakStartDate = messages[0]?.date;
    let longestStreakStart = messages[0]?.date;
    let longestStreakEnd = messages[0]?.date;
    let lastDate = messages[0]?.timestamp;

    for (let i = 1; i < messages.length; i++) {
        const dayDiff = Math.floor((messages[i].timestamp - lastDate) / (1000 * 60 * 60 * 24));

        if (dayDiff <= 1) {
            if (dayDiff === 1) currentStreak++;
        } else {
            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
                longestStreakStart = streakStartDate;
                longestStreakEnd = messages[i - 1].date;
            }
            currentStreak = 1;
            streakStartDate = messages[i].date;
        }
        lastDate = messages[i].timestamp;
    }

    // Check final streak
    if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStart = streakStartDate;
        longestStreakEnd = messages[messages.length - 1].date;
    }

    milestones.push({
        type: 'longest_streak',
        label: 'Longest Conversation Streak',
        days: longestStreak,
        startDate: longestStreakStart,
        endDate: longestStreakEnd
    });

    // Most messages in a single day
    const dailyCount = {};
    for (const msg of messages) {
        const dayKey = msg.timestamp.toISOString().split('T')[0];
        dailyCount[dayKey] = (dailyCount[dayKey] || 0) + 1;
    }

    const maxDay = Object.entries(dailyCount).sort((a, b) => b[1] - a[1])[0];
    if (maxDay) {
        milestones.push({
            type: 'most_messages_day',
            label: 'Most Messages in One Day',
            date: maxDay[0],
            count: maxDay[1]
        });
    }

    // Last message
    if (messages.length > 0) {
        const last = messages[messages.length - 1];
        milestones.push({
            type: 'latest_message',
            label: 'Most Recent Message',
            date: last.date,
            timestamp: last.timestamp.toISOString()
        });
    }

    return milestones;
}

/**
 * Calculate response time statistics
 */
function calculateResponseTimes(messages) {
    const responseTimes = { you: [], partner: [] };

    for (let i = 1; i < messages.length; i++) {
        const prev = messages[i - 1];
        const curr = messages[i];

        // Only count if different sender (it's a response)
        if (prev.isYou !== curr.isYou || prev.isPartner !== curr.isPartner) {
            const timeDiff = (curr.timestamp - prev.timestamp) / (1000 * 60); // in minutes

            // Only count responses within 24 hours
            if (timeDiff > 0 && timeDiff < 24 * 60) {
                if (curr.isYou) {
                    responseTimes.you.push(timeDiff);
                } else if (curr.isPartner) {
                    responseTimes.partner.push(timeDiff);
                }
            }
        }
    }

    const avgResponseTime = (times) => {
        if (times.length === 0) return 0;
        return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    };

    return {
        yourAvgResponseMinutes: avgResponseTime(responseTimes.you),
        partnerAvgResponseMinutes: avgResponseTime(responseTimes.partner)
    };
}

// ============================================
// Main Execution
// ============================================

function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('Usage: node parse-chat.js <chat-file.txt> <your-name> <partner-name>');
        console.log('Example: node parse-chat.js "./WhatsApp Chat.txt" "Smith" "Partner"');
        console.log('\nOptional: Add relationship start date as 4th argument (DD/MM/YYYY)');
        console.log('Example: node parse-chat.js "./chat.txt" "Smith" "Partner" "22/08/2023"');
        process.exit(1);
    }

    const [chatFile, yourName, partnerName, startDateStr] = args;
    const relationshipStartDate = startDateStr ? parseSimpleDate(startDateStr) : new Date('2023-08-22');

    console.log(`\nParsing WhatsApp chat from: ${chatFile}`);
    console.log(`Your name: ${yourName}`);
    console.log(`Partner name: ${partnerName}`);
    console.log(`Relationship start date: ${relationshipStartDate.toDateString()}\n`);

    // Read file
    if (!fs.existsSync(chatFile)) {
        console.error(`Error: File not found: ${chatFile}`);
        process.exit(1);
    }

    const content = fs.readFileSync(chatFile, 'utf-8');
    console.log(`File size: ${(content.length / 1024 / 1024).toFixed(2)} MB`);

    // Parse messages
    console.log('Parsing messages...');
    const messages = parseWhatsAppChat(content, yourName, partnerName);
    console.log(`Total messages parsed: ${messages.length}`);

    // Filter to only your conversations (exclude group system messages etc)
    const relevantMessages = messages.filter(m => m.isYou || m.isPartner);
    console.log(`Relevant messages (you + partner): ${relevantMessages.length}`);

    // Calculate all statistics
    console.log('\nCalculating statistics...');

    const stats = {
        generated: new Date().toISOString(),
        yourName,
        partnerName,
        basic: calculateBasicStats(relevantMessages, relationshipStartDate),
        monthly: calculateMonthlyFrequency(relevantMessages),
        hourly: calculateHourlyDistribution(relevantMessages),
        dayOfWeek: calculateDayOfWeekDistribution(relevantMessages),
        words: calculateWordFrequency(relevantMessages, [yourName, partnerName]),
        milestones: findMilestones(relevantMessages),
        responseTimes: calculateResponseTimes(relevantMessages),

        // Visit-specific data (Nov 27 - Dec 16, 2025)
        visitStats: {
            startDate: '2025-11-27',
            endDate: '2025-12-16',
            daily: calculateDailyFrequency(relevantMessages, '2025-11-27', '2025-12-16')
        }
    };

    // Output stats
    const outputPath = path.join(__dirname, 'data', 'chat-stats.json');
    fs.writeFileSync(outputPath, JSON.stringify(stats, null, 2));

    console.log(`\nStatistics saved to: ${outputPath}`);
    console.log('\n--- Summary ---');
    console.log(`Days together: ${stats.basic.daysTogether}`);
    console.log(`Total messages: ${stats.basic.totalMessages}`);
    console.log(`Your messages: ${stats.basic.yourMessages} (${Math.round(stats.basic.yourMessages / stats.basic.totalMessages * 100)}%)`);
    console.log(`Partner messages: ${stats.basic.partnerMessages} (${Math.round(stats.basic.partnerMessages / stats.basic.totalMessages * 100)}%)`);
    console.log(`Total words: ${stats.basic.totalWords.toLocaleString()}`);
    console.log(`Average messages/day: ${stats.basic.averageMessagesPerDay}`);
    console.log(`Top word: "${stats.words.topWord}"`);
    console.log(`Top emoji: ${stats.words.topEmoji}`);
    console.log(`Peak chat hour: ${stats.hourly.labels[stats.hourly.peakHour]}`);
    console.log(`Most active day: ${stats.dayOfWeek.mostActiveDay}`);
}

function parseSimpleDate(dateStr) {
    const parts = dateStr.split('/');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
}

main();
