const { openai } = require('./openai')

async function getGeneralMapping(request) {
    const command = "Given a list of words, generate a mapping of more general terms. For example, given input=['mobile', 'phone','smartphone', 'mobilephone'], the output should be {\"mobile\":\"smartphone\",\"phone\":\"smartphone\"}. Return the output as: {mappings}. The input data is as follows:\n"
    request = { "role": "user", "content": command + request }
    let tried = 0;
    while (tried < 3) {
        try {
            let resp;
            try {
                resp = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [{ 'role': 'system', 'content': ("Your task is to create mappings for arrays of types or categories. You identify patterns within the input and produce a mapping that represents the general terms for similar entries. Output will be in requested format, or return \"CODE400\" for errors. No assumptions or communication.") }, request]
                })
            } catch (err) {
                throw new Error('SERVER_ERROR ' + err)
            }
            const result = resp.data.choices[0].message.content
            const indexOfOutput = result.indexOf('output')
            const startIndex = result.indexOf('{', indexOfOutput === -1 ? undefined : indexOfOutput)
            const endIndex = result.lastIndexOf('}')
            if (startIndex === -1 && endIndex === -1) {
                throw new Error('Invalid object')
            }

            const mapping = JSON.parse(result.substring(startIndex, endIndex + 1))

            // console.log(`Output: ${JSON.stringify(mapping)}`)
            return mapping
        }
        catch (err) {
            if (!err.message.includes('SERVER_ERROR')) {
                tried++;
            } else {
                if (err.message.includes('SERVER_ERROR') && err.message.includes('429')) {
                    console.log('AI requests/min limit reached. Waiting for 1 minute...')
                    await new Promise(resolve => setTimeout(resolve, 60000));
                }
            }
            continue;
        }
    }
    return {}

}


module.exports.getGeneralMapping = getGeneralMapping;