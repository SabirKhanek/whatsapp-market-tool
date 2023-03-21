const { db } = require('./db')
const path = require('path');
const _ = require('lodash');

// QUERY TO CHECK IF CHAT EXISTS (WILL BE USED LATER)
const queryGetMessageId = db.prepare(`SELECT id FROM chat WHERE id = ? or chatMessage = ?`);
// END

const queryInsertIntoNewMessages = db.prepare(`INSERT INTO NEW_MESSAGES (message_body) VALUES (?)`)

const queryGetNewMessages = db.prepare(`SELECT * FROM NEW_MESSAGES`);

const queryDeleteNewMessages = db.prepare(`DELETE FROM NEW_MESSAGES`);

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

function deleteNewMessages() {
    queryDeleteNewMessages.run()
}

function getNewMessages() {
    const messages = queryGetNewMessages.all().map(message => JSON.parse(message.message_body));
    return messages;
}

function saveNewMessage(message) {
    queryInsertIntoNewMessages.run(JSON.stringify(message))
}

module.exports.newMessages = { get: getNewMessages, save: saveNewMessage, delete: deleteNewMessages }

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