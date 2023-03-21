const { openai } = require('./openai')
const { getIntentAnalysisCmd: getCommand } = require('./prompts')

async function extractIntent(request) {
    request = getCommand(request)
    request = { "role": "user", "content": request }
    try {
        const resp = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ 'role': 'system', 'content': ("Perform Sentiment Analysis on text input and provide the result. Do not ask for additional information, only process the given text. Use '-' for missing information. Output 'CODE400' if no sentiment is found.") }, request]
        })

        if (resp.data.choices[0].message.content) {
            txt = resp.data.choices[0].message.content
            return txt
        } else {
            return resp.message
        }
    }
    catch (err) {
        return "SERVER_ERROR" + err.message
    }
}

// extractIntent(`WTS:

// iPhone 8 64gb A1905
// Condition: Tested Unlocked
// Grade: A/B/C
// Colors: Mix
// Quantity: 500

// PM for details`).then((res) => console.log(res)).catch((err) => console.log(err.message))


module.exports = extractIntent;