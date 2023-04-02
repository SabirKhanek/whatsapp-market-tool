const Database = require('better-sqlite3');
const fs = require('fs');

// Define the path to the SQLite database file
const storage = (process.env.storage_mount && fs.existsSync(process.env.storage_mount)) ? process.env.storage_mount : '.'
const dir = storage + '/db';

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}


const DB_PATH = dir + '/intents.sqlite';

const db = new Database(DB_PATH);

// Read the SQL script from the file
const tableCreateScript = `CREATE TABLE IF NOT EXISTS Chat(
    id TEXT PRIMARY KEY,
    chatId TEXT NOT NULL,
    chatName TEXT NOT NULL,
    chatMessage TEXT NOT NULL,
    chatType TEXT NOT NULL,
    chatMessageAuthor TEXT NOT NULL,
    chatMessageTime TEXT NOT NULL
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS Product (
    intent TEXT NOT NULL,
    prd_id INTEGER PRIMARY KEY,
    chatId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY (chatId) REFERENCES Chat(id)
);
CREATE TABLE IF NOT EXISTS Variant (
    variant_id INTEGER PRIMARY KEY,
    prd_id INTEGER NOT NULL,
    name TEXT DEFAULT '-',
    quantity TEXT DEFAULT '-',
    condition TEXT DEFAULT '-',
    brand TEXT DEFAULT '-',
    price TEXT DEFAULT '-',
    remarks TEXT DEFAULT '-',
    FOREIGN KEY (prd_id) REFERENCES Product(prd_id)
);
CREATE TABLE IF NOT EXISTS Tag (
    tag_id INTEGER PRIMARY KEY,
    tag_name TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS TagVariant (
    variant_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES Variant(variant_id),
    FOREIGN KEY (tag_id) REFERENCES Tag(tag_id),
    PRIMARY KEY (variant_id, tag_id)
);
CREATE TABLE IF NOT EXISTS PROCESSED_MESSAGES (message_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS NEW_MESSAGES (message_body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS CLASSIFIED_MESSAGES (message TEXT NOT NULL, intent TEXT NOT NULL);`

db.exec(tableCreateScript);



db.function('similarity', (a, b) => {
    try {
        a = a.toLowerCase();
        b = b.toLowerCase();
        if (a === '-' || b === '-') return 1;
        const stem = (word) => {
            const suffixes = ['s', 'es', 'ed', 'ing'];
            for (let i = 0; i < suffixes.length; i++) {
                const suffix = suffixes[i];
                if (word.endsWith(suffix)) {
                    return word.slice(0, -suffix.length);
                }
            }
            return word;
        }
        // Compute the Jaccard similarity of two strings with word stemming
        const setA = new Set(a.split(' ').map(stem));
        const setB = new Set(b.split(' ').map(stem));
        const intersection = new Set([...setA].filter(x => setB.has(x)));
        const union = new Set([...setA, ...setB]);
        return intersection.size / union.size;
    } catch (err) {
        return 0
    }

})

db.function('mergestr', (a, b) => {
    if (a === '-') {
        return b
    } else if (b === '-') {
        return a
    }
    const removeCommon = (str1, str2) => {
        // Convert strings to arrays of words
        if (typeof str1 !== 'string') {
            str1 = '-'
        } else if (typeof str2 !== 'string') {
            str2 = '-'
        }
        const arr1 = str1.toLowerCase().split(' ');
        const arr2 = str2.toLowerCase().split(' ');

        // Loop through the first array and remove common words
        for (let i = 0; i < arr1.length; i++) {
            if (arr2.includes(arr1[i])) {
                arr1.splice(i, 1);
                i--;
            }
        }

        // Convert modified array back to a string
        const result = arr1.join(' ');

        return result;
    }
    b = removeCommon(b, a);
    return a + ' ' + b;
})

module.exports.db = db