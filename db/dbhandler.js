const { db } = require('./db')
const path = require('path');
const _ = require('lodash');

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
CREATE TABLE IF NOT EXISTS PROCESSED_MESSAGES (message_id TEXT NOT NULL)`

db.exec(tableCreateScript);

// QUERY TO CHECK IF CHAT EXISTS (WILL BE USED LATER)
const queryGetMessageId = db.prepare(`SELECT id FROM chat WHERE id = ? or chatMessage = ?`);
// END

const queryInsertChat = db.prepare(`INSERT INTO chat (id ,chatId, chatName, chatType, chatMessage, chatMessageAuthor, chatMessageTime) VALUES (?,?, ?, ?, ?, ?, ?)`);

const queryInsertProduct = db.prepare(`INSERT INTO PRODUCT (intent, chatId, name, type) VALUES (?, ?, ?, ?)`);

const queryInsertVariant = db.prepare(`INSERT INTO VARIANT (prd_id, name, quantity, condition, price, brand, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)`);

const queryInsertTags = db.prepare(`INSERT INTO TAG (tag_name) VALUES (?)`);

const queryInsertTagVariant = db.prepare(`INSERT INTO TagVariant (tag_id, variant_id) VALUES (?, ?)`);

const queryInsertProcessedMessage = db.prepare(`INSERT INTO PROCESSED_MESSAGES (message_id) VALUES (?)`)

const queryGetTag = db.prepare(`SELECT * FROM TAG WHERE tag_name = ?`);

const saveIntent = (intent) => {
    // INSERT CHAT
    queryInsertChat.run(intent.id, intent.chatId, intent.chatName, intent.chatType, intent.chatMessage, intent.chatMessageAuthor, intent.chatMessageTime);
    // END


    // INSERT PRODUCT
    intent.products.forEach(product => {
        const { lastInsertRowid: insertedPrdId } = queryInsertProduct.run(
            product.intent,
            intent.id,
            product.name,
            product.type !== '' ? product.type.toLowerCase() : '-'
        );

        // INSERT VARIANT
        product.variants.forEach(variant => {
            const { lastInsertRowid: insertedVariantId } = queryInsertVariant.run(
                insertedPrdId,
                variant.name !== '' ? variant.name : '-',
                variant.quantity !== '' ? variant.quantity : '-',
                variant.condition !== '' ? variant.condition : '-',
                variant.price !== '' ? variant.price : '-',
                variant.brand !== '' ? variant.brand : '-',
                variant.remarks !== '' ? variant.remarks : '-'
            );

            // INSERT TAGS
            variant.tags.forEach(tag => {
                if (tag === '' || tag === '-') return;
                try {
                    let tag_id;
                    const tagQueried = queryGetTag.get(tag);
                    if (!tagQueried) {
                        const { lastInsertRowid: tagRow } = queryInsertTags.run(tag);
                        tag_id = tagRow;
                    } else {
                        tag_id = tagQueried.tag_id;
                    }

                    // INSERT TAG_VARIANT
                    queryInsertTagVariant.run(tag_id, insertedVariantId);
                } catch (err) {

                }
            });
        });
    });
}

function ifMessageExist(id = 0, body) {
    const messageInDb = queryGetMessageId.get(id, body);
    if (messageInDb) return true
    else false
}

function getMessageIds() {
    const query = db.prepare(`SELECT message_id AS id FROM PROCESSED_MESSAGES`);
    const messagesIdsObjs = query.all();
    return _(messagesIdsObjs).map(message => message.id).value()
}

function saveIntents(intents) {
    const totalIntents = intents.length;
    let saved = 0;


    intents.forEach(intent => {
        const messageInDb = queryGetMessageId.get(intent.id, intent.chatMessage);
        if (messageInDb) {
            console.log(`Message "${intent.chatMessage.substring(0, 20).replace('\n', ' ')}" already exists in database. Skipping...`)
            return;
        }

        try {
            db.transaction(saveIntent)(intent);
            saved++;
        } catch (err) {
            console.log(`ERROR while SAVING INTENT: ${err}`);
        }
    });

    console.log(`Saved ${saved} from ${totalIntents}`)
    return saved;
}

function registerMessageInDB(msg_id) {
    return queryInsertProcessedMessage.run(msg_id)
}

// intents = [
//     {
//         "chatId": "120363063452915739@g.us",
//         "id": "false_120363063452915739@g.us_6C49342754658138B566ADB4A5BBF81A_923412727290@c.us",
//         "chatName": "Test",
//         "chatMessage": "*Want To Sell*\n\n*Verizon Postpaid Unlocked Orbic RC2210L 4G LTE HD Voice VoLTE Flip Phone* \n1465pcs\nNew/A++\nWith Oem Batteries & Doors\n\n\n*T-Mobile Franklin T9 Mifi Hotspot - With unlock codes*\n1600+pcs\nA+ stock\nWith batteries and door only\nBulk packed\n\n\nReady To Ship\n\nLet me knw if you can use them.",
//         "chatType": "Group",
//         "chatMessageAuthor": "923412727290@c.us",
//         "chatMessageTime": 1678522453,
//         "products": [
//             {
//                 "intent": "Sell",
//                 "name": "Verizon Postpaid Unlocked Orbic RC2210L 4G LTE HD Voice VoLTE Flip Phone",
//                 "type": "phone",
//                 "variants": [
//                     {
//                         "name": "-",
//                         "quantity": "1465pcs",
//                         "condition": "New/A++",
//                         "brand": "-",
//                         "tags": [
//                             "Oem Batteries",
//                             "Doors"
//                         ],
//                         "price": "-",
//                         "remarks": "Ready To Ship"
//                     }
//                 ]
//             },
//             {
//                 "intent": "Sell",
//                 "name": "T-Mobile Franklin T9 Mifi Hotspot",
//                 "type": "mobile",
//                 "variants": [
//                     {
//                         "name": "-",
//                         "quantity": "1600+pcs",
//                         "condition": "A+ stock",
//                         "brand": "-",
//                         "tags": [
//                             "Batteries",
//                             "Door"
//                         ],
//                         "price": "-",
//                         "remarks": "Bulk packed; With unlock codes"
//                     }
//                 ]
//             }
//         ]
//     },
//     {
//         "chatId": "120363063452915739@g.us",
//         "id": "false_120363063452915739@g.us_F6B39BCE8E8EE6208BB4D944AD6F9FD7_923412727290@c.us",
//         "chatName": "Test",
//         "chatMessage": "*Want to Sell* \n\n*Iphone 12 64GB Unlocked (AB stock Kitted)*\n\nPlease Let Us Know If you can Use any\n\nThank you",
//         "chatType": "Group",
//         "chatMessageAuthor": "923412727290@c.us",
//         "chatMessageTime": 1678522454,
//         "products": [
//             {
//                 "intent": "Sell",
//                 "name": "Iphone 12",
//                 "type": "phone",
//                 "variants": [
//                     {
//                         "name": "AB stock Kitted",
//                         "quantity": "-",
//                         "condition": "-",
//                         "brand": "Apple",
//                         "tags": [],
//                         "price": "-",
//                         "remarks": "64GB Unlocked"
//                     }
//                 ]
//             }
//         ]
//     }
// ]
// saveIntents(intents)

module.exports.saveIntents = saveIntents;
module.exports.registerMessageInDB = registerMessageInDB;
module.exports.getMessageIds = getMessageIds;
module.exports.ifMessageExist = ifMessageExist