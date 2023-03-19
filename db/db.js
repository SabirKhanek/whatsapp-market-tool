const Database = require('better-sqlite3');
const fs = require('fs');

// Define the path to the SQLite database file
const dir = './db';

if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}


const DB_PATH = './db/intents.sqlite';

const db = new Database(DB_PATH);


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