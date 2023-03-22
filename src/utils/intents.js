const _ = require('lodash')
const { forEach } = require('p-iteration')
const extractIntent = require('../extractIntent')
const { validateIntent } = require('../validation')
const { getGeneralMapping: getGeneralPrdTypeMapping } = require('../generalize')
const ProgressBar = require('progress');
const { registerMessageInDB, ifMessageExist } = require('../../db/dbhandler')

async function getIntents(messages) {
    const RETRY_LIMIT = 3;
    const intents = []
    const messagesProcessed = []
    const totalMessages = messages.length;
    let processedMessages = 0;
    let progressBarIncrement = () => {
        processedMessages++;
        console.log('Intent generation progress: ' + processedMessages + '/' + totalMessages)
    }

    const isServer = process.env.deployment && process.env.deployment === 'server' ? true : false;

    if (!(isServer)) {
        const progressBar = new ProgressBar('Processing messages [:bar] :current/:total at :rate/s  :elapsed s', {
            complete: '=',
            incomplete: '-',
            width: 20,
            total: totalMessages,
            clear: true
        });
        progressBarIncrement = () => {
            processedMessages++;
            progressBar.tick();
            if (progressBar.complete) {
                console.log(`Found ${intents.length} from ${messages.length}`)
            }
        }
    }

    await forEach(messages, async (message) => {
        // Register the message in DB so same message don't get available.
        messagesProcessed.push(message.id)
        if (ifMessageExist(message.id, message.chatMessage)) {
            progressBarIncrement();
            return;
        }
        if (message.chatMessage.length < 10) {
            progressBarIncrement();
            return;
        }
        let tried = 0;
        while (tried < RETRY_LIMIT) {
            // INTENT GENERATION
            let intent;
            const resp = await extractIntent(message.chatMessage)
            if (resp.includes('SERVER_ERROR')) {
                if (resp.includes('429')) {
                    progressBar.interrupt('AI requests/min limit reached (Consider upgrading your account to avoid this error in future)')
                    const randomWait = Math.floor(Math.random() * 10000) + 5000; // Generates a random number between 5000 and 15000 (in milliseconds)
                    await new Promise(resolve => setTimeout(resolve, randomWait));
                }
                continue;
            }
            // console.log(message.chatMessage)
            // console.log(resp)
            if (resp.includes('CODE400')) {
                progressBarIncrement()
                break;
            }
            const startIndex = resp.indexOf('{')
            const endIndex = resp.lastIndexOf('}')
            try {
                intent = JSON.parse(resp.substring(startIndex, endIndex + 1))
                if (validateIntent.validate(intent).error) {
                    throw new Error('Invalid Intent' + validateIntent.validate(intent).error)
                }
            } catch (error) {
                tried++;
                if (tried === RETRY_LIMIT - 1) {
                    if (!isServer) {
                        progressBar.interrupt(`Ignoring \"${message.chatMessage.substring(0, 20).replace('\n', ' ')}\" ` + error.message)
                    } else {
                        console.log(`Ignoring \"${message.chatMessage.substring(0, 20).replace('\n', ' ')}\" ` + error.message)
                    }
                    progressBarIncrement()
                    break;
                }
                continue;
            }
            const intentObj = {
                ..._(message).pick(['chatId', 'id', 'chatName', 'chatMessage', 'chatType', 'chatMessageAuthor', 'chatMessageTime']).value(), ...intent
            }

            // intent = intent.map(x => Object.fromEntries(Object.entries(x).map(
            //     ([key, value]) => [key, typeof value == 'string' ? value.toLowerCase() : value])));

            intents.push(intentObj)
            progressBarIncrement()
            break;
        }
    })

    // Cleaning Product Types
    const prodTypes = []
    if (intents.length > 1) {
        intents.forEach((intent) => {
            intent.products.forEach((product) => {
                if (prodTypes.includes(product.type)) return
                else prodTypes.push(product.type.toLowerCase())
            })
        })

        const prodTypesMapping = await getGeneralPrdTypeMapping(JSON.stringify(prodTypes));

        intents.forEach((intent) => {
            intent.products.forEach((product) => {
                if (Object.keys(prodTypesMapping).includes(product.type.toLowerCase())) {
                    product.type = prodTypesMapping[product.type.toLowerCase()].toLowerCase()
                }
            })
        })
    }
    // // End Cleaning
    // // Register the messages in DB
    messagesProcessed.forEach((message) => {
        try {
            registerMessageInDB(message)
        } catch (err) {
            console.log('Error in registering message in DB', err)
        }
    })
    return intents
}

// messages = [
//     {
//         "chatId": "120363063452915739@g.us",
//         "chatName": "Test",
//         "chatType": "Group",
//         "chatMessage": "*Want To Sell*\n\n*Verizon Postpaid Unlocked Orbic RC2210L 4G LTE HD Voice VoLTE Flip Phone* \n1465pcs\nNew/A++\nWith Oem Batteries & Doors\n\n\n*T-Mobile Franklin T9 Mifi Hotspot - With unlock codes*\n1600+pcs\nA+ stock\nWith batteries and door only\nBulk packed\n\n\nReady To Ship\n\nLet me knw if you can use them.",
//         "chatMessageAuthor": "923412727290@c.us",
//         "chatMessageTime": 1678522453,
//         "id": "false_120363063452915739@g.us_6C49342754658138B566ADB4A5BBF81A_923412727290@c.us",
//         "fromMe": false
//     },
//     {
//         "chatId": "120363063452915739@g.us",
//         "chatName": "Test",
//         "chatType": "Group",
//         "chatMessage": "*Want to Sell* \n\n*Iphone 12 64GB Unlocked (AB stock Kitted)*\n\nPlease Let Us Know If you can Use any\n\nThank you",
//         "chatMessageAuthor": "923412727290@c.us",
//         "chatMessageTime": 1678522454,
//         "id": "false_120363063452915739@g.us_F6B39BCE8E8EE6208BB4D944AD6F9FD7_923412727290@c.us",
//         "fromMe": false
//     }, {
//         "chatId": "923412727290@c.us",
//         "chatName": "Sabir Khan",
//         "chatType": "Individual",
//         "chatMessage": "%%get_summary",
//         "chatMessageAuthor": "Sabir Khan",
//         "chatMessageTime": 1678522467,
//         "id": "false_923412727290@c.us_51402702B2F8C635E3F96EED411F5C0E",
//         "fromMe": false
//     },
//     {
//         "chatId": "923412727290@c.us",
//         "chatName": "Sabir Khan",
//         "chatType": "Individual",
//         "chatMessage": "%%generate_intents",
//         "chatMessageAuthor": "Sabir Khan",
//         "chatMessageTime": 1678522556,
//         "id": "false_923412727290@c.us_DDEF20A31D144BD989C01E6B6CEA054D",
//         "fromMe": false
//     }
// ]


// getIntents(messages).then((intents) => {
//     console.log(JSON.stringify(intents, null, 2))
// }).catch((err) => {
//     console.log(err)
// })

module.exports.getIntents = getIntents
