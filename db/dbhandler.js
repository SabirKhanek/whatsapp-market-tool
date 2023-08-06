const { db } = require('./db')
const path = require('path');
const _ = require('lodash');

// QUERY TO CHECK IF CHAT EXISTS (WILL BE USED LATER)
const queryGetMessageId = db.prepare(`SELECT id FROM chat WHERE id = ? or chatMessage = ?`);
// END

const queryInsertIntoClassifiedMessages = db.prepare(`INSERT INTO CLASSIFIED_MESSAGES (message, intent) VALUES (?, ?)`);
const queryUpdateClassifiedMessages = db.prepare(`UPDATE CLASSIFIED_MESSAGES SET intent = ? WHERE message = ?`);
const queryGetClassifiedMessage = db.prepare(`SELECT message FROM CLASSIFIED_MESSAGES WHERE message = ?`);

const queryInsertIntoNewMessages = db.prepare(`INSERT INTO NEW_MESSAGES (message_body) VALUES (?)`)

const queryGetNewMessages = db.prepare(`SELECT * FROM NEW_MESSAGES`);

const queryDeleteNewMessages = db.prepare(`DELETE FROM NEW_MESSAGES`);

const queryInsertChat = db.prepare(`INSERT INTO chat (id ,chatId, chatName, chatType, chatMessage, chatMessageAuthor, chatMessageTime) VALUES (?,?, ?, ?, ?, ?, ?)`);

const queryInsertProduct = db.prepare(`INSERT INTO PRODUCT (intent, chatId, name, type, quantity, ram, storage, processor, brand, price, remarks, condition, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const queryInsertProcessedMessage = db.prepare(`INSERT INTO PROCESSED_MESSAGES (message_id) VALUES (?)`)




const registerClassifiedMessage = (message, intent) => {
    const messageInDb = queryGetClassifiedMessage.get(message);
    if (messageInDb) {
        queryUpdateClassifiedMessages.run(intent, message);
    } else {
        queryInsertIntoClassifiedMessages.run(message, intent);
    }
}

const saveIntent = (intent) => {
    // INSERT CHAT
    queryInsertChat.run(intent.id, intent.chatId, intent.chatName, intent.chatType, intent.chatMessage, intent.chatMessageAuthor, intent.chatMessageTime);
    // END

    // INSERT PRODUCT
    intent.products.forEach(product => {
        const { lastInsertRowid: insertedPrdId } = queryInsertProduct.run(
            product.intent,
            intent.id,
            product.name.toLowerCase(),
            !['n/a', 'N/A', ''].includes(product.type) && product.type !== undefined ? product.type.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.quantity) && product.quantity !== undefined ? product.quantity.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.ram) && product.ram !== undefined ? product.ram.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.storage) && product.storage !== undefined ? product.storage.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.processor) && product.processor !== undefined ? product.processor.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.brand) && product.brand !== undefined ? product.brand.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.price) && product.price !== undefined ? product.price.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.remarks) && product.remarks !== undefined ? product.remarks.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.condition) && product.condition !== undefined ? product.condition.toLowerCase() : '-',
            !['n/a', 'N/A', ''].includes(product.color) && product.color !== undefined ? product.color.toLowerCase() : '-'
        );
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
            // console.log(`intent: ${JSON.stringify(intent)}`);
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
//     { "chatId": "923246700564@c.us", "id": "false_923246700564@c.us_A87AAB426F011E2A352C0F00F9655FFD", "chatName": "+92 324 6700564", "chatMessage": "Selling Ready Stock*\t\nBrand New / Non-active\nPrice AED\t\n\t\n🇯🇵 14 Pro Max 1TB \nBlack/Gold \nPurple \n\n🇯🇵 14 Pro Max 128GB \nBlack\n\n🇯🇵 14 Pro 1TB Black \n\n🇯🇵 iPhone 14 Plus 512GB Blue \t\n\n🇯🇵 iPhone 14 Plus 256GB \nMidnight \t/ starlight /purple / blue \n\n🇯🇵 iPhone 14 Plus 128GB \nMidnight \t/ starlight / purple \n\n🇯🇵 iPhone 13 Pro Max 1TB \nGreen / Gold / blue \n\n🇯🇵 iPhone 13 Pro Max 256GB \nGreen \t/ Blue / silver \n\n�🇵  iPhone 13 Pro Max 128GB \nGreen \t/ Graphite / Blue \n\n🇯🇵 iPhone 13 Pro 512GB \nGreen \t/ Silver \n\n🇯🇵 iPhone 13 Pro 256GB \n Green \t/ Blue \n\n🇯🇵 iPhone 13 Pro 128GB \nGreen \t/ Blue / Silver \n\n🇯🇵 13 128GB \nMidnight/ starlight \n\n\n🇦🇪 13 256GB Midnight    \n\n🇭🇰 14 Pro Max 128GB Black \t\n\t\n🇮🇳 14 128GB Starlight/Blue \n🇮🇳 13 256GB Midnight     \n🇮🇳 12 256GB Black \t\n\n🇮🇳 SE 2 256GB \nRED \nBlack/White \n\n🇺🇸 11 Pro Max 256GB Green \t\n🇺🇸 11 Pro Max 64GB Green/Silver \n🇺🇸 11 Pro 256GB Gold \t\n🇺🇸 11 64GB Black/red \n🇺🇸 Xr 64GB RED \t\n\t\n🇩🇪 12 Pro Max 512GB Silver \t\n\n🇹🇼 12 Mini 256GB\nRed \nBlack/Green/Purple/White \n\n🇹🇼 12 Mini 128GB\nBlack/Purple/White \n\n🇹🇼 12 Mini 64GB\nBlack/Green/Purple/White \n\n🇵🇾 SE 2 256GB Black \t\n\t\n🇧🇭 Xs Max 64GB Silver/Gray \n\n- - - - - - - - - - - - - - - -\nAccessories\n\n🇺🇸 TV 4K 2nd Gen 64GB A2169 \t\n🇺🇸  Series 7 41MM Silver Steel \t\n\n🇬🇧 AirTag 4 pack MC \n\n\t\n\t*+971502305191 *\n• PM to place your order:\t\nTHT | Three Heros Trading L.L.C", "chatType": "Individual", "chatMessageAuthor": "+92 324 6700564", "chatMessageTime": 1681486600, "products": [{ "intent": "Sell", "name": "iphone 14 pro max", "type": "smartphone", "ram": "1 TB", "color": "Black/Gold/Purple", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 14 pro max", "type": "smartphone", "ram": "128 GB", "color": "Black", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 14 pro", "type": "smartphone", "ram": "1 TB", "color": "Black", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 14 plus", "type": "smartphone", "ram": "512 GB", "color": "Blue", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 14 plus", "type": "smartphone", "ram": "256 GB", "color": "Midnight/Starlight/Purple/Blue", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 14 plus", "type": "smartphone", "ram": "128 GB", "color": "Midnight/Starlight/Purple", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13 pro max", "type": "smartphone", "ram": "1 TB", "color": "Green/Gold/Blue", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13 pro max", "type": "smartphone", "ram": "256 GB", "color": "Green/Blue/Silver", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13 pro max", "type": "smartphone", "ram": "128 GB", "color": "Green/Graphite/Blue", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13 pro", "type": "smartphone", "ram": "512 GB", "color": "Green/Silver", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13 pro", "type": "smartphone", "ram": "256 GB", "color": "Green/Blue", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13 pro", "type": "smartphone", "ram": "128 GB", "color": "Green/Blue/Silver", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13", "type": "smartphone", "ram": "128 GB", "color": "Midnight/Starlight", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 13", "type": "smartphone", "ram": "256 GB", "color": "Midnight", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 12", "type": "smartphone", "ram": "256 GB", "color": "Black", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone SE 2", "type": "smartphone", "ram": "256 GB", "color": "RED", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone SE 2", "type": "smartphone", "ram": "256 GB", "color": "Black/White", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 11 pro max", "type": "smartphone", "ram": "256 GB", "color": "Green", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 11 pro max", "type": "smartphone", "ram": "64 GB", "color": "Green/Silver", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 11 pro", "type": "smartphone", "ram": "256 GB", "color": "Gold", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone 11", "type": "smartphone", "ram": "64 GB", "color": "Black/Red", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone XR", "type": "smartphone", "ram": "64 GB", "color": "RED", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iphone XS Max", "type": "smartphone", "ram": "64 GB", "color": "Silver/Gray", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iPad 10", "type": "tablet", "ram": "-", "color": "red", "storage": "64 GB", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "iPad pro 11 M2", "type": "tablet", "ram": "-", "color": "yellow", "storage": "128 GB", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "TV 4K 2nd Gen", "type": "accessories", "ram": "-", "color": "-", "storage": "64 GB", "quantity": "-", "processor": "A12 Bionic", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "Series 7 41MM", "type": "accessories", "ram": "-", "color": "Silver Steel", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }, { "intent": "Sell", "name": "AirTag 4 pack MC", "type": "accessories", "ram": "-", "color": "-", "storage": "-", "quantity": "-", "processor": "-", "condition": "Brand New / Non-active", "brand": "Apple", "price": "AED" }] }
// ]
// saveIntents(intents)

module.exports.saveIntents = saveIntents;
module.exports.registerMessageInDB = registerMessageInDB;
module.exports.getMessageIds = getMessageIds;
module.exports.ifMessageExist = ifMessageExist;
module.exports.registerClassifiedMessage = registerClassifiedMessage;
module.exports.execSql = (query) => {
    try {
        const result = db.prepare(query).run()
        return JSON.stringify(result)
    } catch (err) {
        return err.message
    };
};
module.exports.isClassifed = (message) => {
    const messageInDb = queryGetClassifiedMessage.get(message);
    return !!messageInDb;
}