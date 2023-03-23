// Check if the environment variables are set

if (!process.env.openai_key) {
    console.log('Please set the openai_key environment variables')
    process.exit(1)
}

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { TimeFilter, newMessageInterval } = require('./src/config');
const { getIntents } = require('./src/utils/intents')
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: dataPath = (process.env.storage_mount && fs.existsSync(process.env.storage_mount)) ? process.env.storage_mount + '/wweb-session' : undefined }),
    puppeteer: {
        executablePath: process.env.deployment && process.env.deployment === 'server' ? undefined : './puppeteer/win64-982053/chrome-win/chrome.exe',
        args: ['--no-sandbox', "--disable-setuid-sandbox"]
    }
});


// assign client to chat actions performer script
const { setClient, getMessages: getMessages, getMessageObj, getBatchClassifiedMessages } = require('./src/utils/chats');
const { saveIntents, newMessages } = require('./db/dbhandler');
setClient(client)
const { getExcelPath, getPotentialPairsPath } = require('./db/query2xl');
const extractIntent = require('./src/extractIntent');


// Lock intent generation if already in progress
var intentMutex = false

// New Messages temporary storage for barch intent generation
async function generateNewMsgIntents() {
    const messages = newMessages.get()
    if (newMessages.get().length <= 0) return

    const currentMessages = [...messages]
    newMessages.delete()
    const msgs = await getBatchClassifiedMessages(currentMessages)

    if (msgs.length <= 0) return

    getIntents(msgs).then((intents) => {
        saveIntents(intents)
    }).catch((err) => {
        console.log('Error while getting intents: ', err)
    })
}

var newMessageCronJon = setInterval(generateNewMsgIntents, newMessageInterval.getTime() * 1000)

function modifyInterval() {
    clearInterval(newMessageCronJon)
    newMessageCronJon = setInterval(generateNewMsgIntents, newMessageInterval.getTime() * 1000)
}


client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED: ', qr);
    qrcode.generate(qr, { small: true })
    console.log("Scan this QR from your whatsapp to link.")
});


client.on('message', async (message) => {
    try {
        if (message.body <= 0) return
        if (message.from === 'status@broadcast') return
        if (!message.body.includes('%%')) {
            const msg = await getMessageObj(message)
            if (!msg) return
            newMessages.save(msg)
            return
        }


        if (message.body === '%%check') {
            await client.sendMessage(message.from, 'Messages are coming through just fine.')
            return
        }

        if (message.body === '%%make_me_admin') {
            process.env.admin = message.from
            console.log('Admin has been updated to: ', process.env.admin)
            await client.sendMessage(message.from, 'Admin has been updated to: ' + process.env.admin)
            return;
        }

        //Return if the command is not sent by admin
        if (!(process.env.admin && message.from.includes(process.env.admin))) {
            return
        }


        // Commands
        if (message.body.startsWith('%%verify_intent')) {
            const text = message.body.split(' ').slice(1).join(' ')

            if (text && text.length > 0) {
                const resp = await extractIntent(text)
                if (resp) {
                    client.sendMessage(message.from, resp)
                }
            }
        }

        if (message.body === '%%help') {
            const messageSent = await client.sendMessage(message.from, `Commands:\n- %%make_me_admin: make the sender as admin\n- %%time_filter: Update the timeframe for messages extraction\n- %%get_summary: List number of messages after applied filter\n- %%get_products: Send the excel file of intents generation summary to the admin\n- %%get_pairs: Generate excel file with buy and sell pairs e.g., %%get_pairs\n- %%generate_intents\n- %%new_messages_interval: Update the interval for new messages intent generation\n- %%verify_intent: generate the intent of the message\n- %%check: Check if the bot is working`)
            await messageSent.delete()
            return;
        }

        if (message.body.startsWith('%%time_filter')) {
            const time = message.body.split(' ')[1]

            if (!time) {
                client.sendMessage(message.from, `Current time filter is (${TimeFilter.getTime()} seconds) Please provide the time in seconds.`)
                return;
            }
            TimeFilter.setTime(time)
            client.sendMessage(message.from, 'Time filter has been updated to: ' + TimeFilter.getTime())
            return;
        }


        if (message.body.startsWith('%%new_messages_interval')) {
            const time = message.body.split(' ')[1]

            if (!time) {
                client.sendMessage(message.from, `Current interval is set to (${newMessageInterval.getTime()} seconds) Please provide the time in seconds.`)
                return;
            }
            if (time < 15 * 60 && !message.body.includes('-dev')) {
                client.sendMessage(message.from, `Minimum interval is 15 minutes. Current time filter is (${newMessageInterval.getTime()} seconds)`)
                return;
            }

            newMessageInterval.setTime(time)
            modifyInterval()
            client.sendMessage(message.from, 'Time filter has been updated to: ' + newMessageInterval.getTime() + ' seconds')
            return;
        }


        if (message.body === '%%get_summary') {
            await message.delete()
            const messages = await getMessages()
            const messageSent = await client.sendMessage(message.from, `Filters:\n- last (${TimeFilter.getTime()} seconds)\n- Exclude already saved messages\nMessage: ${messages.length}`)
            await messageSent.delete()
            return
        }

        if (message.body === '%%get_products') {
            await message.delete()
            const excelPath = await getExcelPath()
            const fileData = fs.readFileSync(excelPath);
            const base64String = Buffer.from(fileData).toString('base64');
            const mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const media = new MessageMedia(mimetype, base64String, 'products.xlsx');
            client.sendMessage(message.from, media, { caption: 'Here is your excel file.' })
            return;
        }

        if (message.body === '%%get_pairs') {
            await message.delete()
            const excelPath = await getPotentialPairsPath()
            const fileData = fs.readFileSync(excelPath);
            const base64String = Buffer.from(fileData).toString('base64');
            const mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const media = new MessageMedia(mimetype, base64String, 'potential_buysell_pairs.xlsx');
            client.sendMessage(message.from, media, { caption: 'Here is your excel file.' })
            return;
        }

        if (message.body === '%%generate_intents') {
            if (intentMutex) {
                await (await client.sendMessage(message.from, 'Intent generation is already in progress. Please wait for it to finish.')).delete()
                await message.delete()
                return
            }
            intentMutex = true
            await (await client.sendMessage(message.from, 'Request recieved, Now processing your request. Look at the console for logs.')).delete()
            await message.delete()
            const messages = await getMessages()
            const intents = await getIntents(messages)
            console.log('Saving the generated intents in the database.')
            const savedLength = saveIntents(intents)
            const messageSent = await client.sendMessage(message.from, `Done\nTotal ${intents.length} intents generated out of ${messages.length} messages, and saved ${savedLength} in database.`)

            await messageSent.delete()
            intentMutex = false
        } else {
            await message.delete()
        }
    } catch (error) {
        console.log(error.message)
    }

})

client.on('ready', async () => {
    console.log('Client is ready!');
    console.log("Logged in as: " + client.info.pushname)
    console.log('Bot phone #: ' + client.info.wid._serialized)
    console.log(("Wait some time for the client to load all the chats."))
});


client.on('disconnected', async (reason) => {
    console.log('Client was logged out', reason);
    await client.destroy();
    client.initialize();
})

client.initialize()