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
        if (message.predictedIntent) {
            message.chatMessage += '\nPredicted Intent: ' + message.predictedIntent
        }
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
                    console.log('AI requests/min limit reached (Consider upgrading your account to avoid this error in future)')
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                continue;
            }

            if (resp.includes('CODE400')) {
                progressBarIncrement()
                return
            }

            try {
                const startIndex = resp.indexOf('{')
                const endIndex = resp.lastIndexOf('}')
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

            if (intentObj.chatMessage.includes('\nPredicted Intent:')) {
                intentObj.chatMessage = intentObj.chatMessage.substring(0, intentObj.chatMessage.indexOf('\nPredicted Intent:'))
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
//         "chatMessage": "WTB Iphone 12 64GB Unlocked (AB stock Kitted)\n\nPlease Let Us Know If you can Use any\n\nThank you",
//         "chatMessageAuthor": "923412727290@c.us",
//         "chatMessageTime": 1678522453,
//         "id": "false_120363063452915739@g.us_6C49342754658138B566ADB4A5BBF81A_923412727290@c.us",
//         "fromMe": false,
//         "predictedIntent": 'Buy'
//     },
//     {
//         "chatId": "120363063452915739@g.us",
//         "chatName": "Test",
//         "chatType": "Group",
//         "chatMessage": "WTS: Iphone 8 128GB unlocked (A++)",
//         "chatMessageAuthor": "923412727290@c.us",
//         "chatMessageTime": 1678522454,
//         "id": "false_120363063452915739@g.us_F6B39BCE8E8EE6208BB4D944AD6F9FD7_923412727290@c.us",
//         "fromMe": false,
//         "predictedIntent": 'Sell'
//     }
// ]


// getIntents(messages).then((intents) => {
//     console.log(JSON.stringify(intents, null, 2))
// }).catch((err) => {
//     console.log(err)
// })

module.exports.getIntents = getIntents
