require('dotenv').config()
// console.log(process.env.openai_key)
const fs = require('fs');
const inquirer = require('inquirer');
const { Configuration, OpenAIApi } = require("openai")

async function checkOpenAIKey(apiKey) {
    try {
        const configuration = new Configuration({
            apiKey: apiKey
        });
        const openai = new OpenAIApi(configuration)
        const response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ 'role': 'user', 'content': ("Hi") }]
        })
        return true; // The API key is valid
    } catch (error) {
        throw new Error('Validation failed: ' + error.message)
    }
}


const req_vars = {
    'openai_key': {
        desc: 'OpenAI API key',
        validation: checkOpenAIKey,
        onInvalid: 'Invalid OpenAI key'
    },
    'admin': {
        desc: 'Admin phone number',
    }
}

const prompts = Object.keys(req_vars).map((variable) => {
    const desc = req_vars[variable].desc;
    const error = req_vars[variable].onInvalid;
    const defaultVal = process.env[variable];
    return {
        type: 'input',
        name: variable,
        message: `Enter ${desc ? desc : variable} : `,
        default: defaultVal,
        validate: async (input) => {
            const validation = req_vars[variable].validation;
            if (!validation) return true;
            try {
                const isValid = await validation(input)
                return isValid
            } catch (err) {
                return err.message
            }
        }
    };
});

function updateEnvFile() {
    let data = '';
    Object.keys(req_vars).forEach((variable) => {
        data += `${variable}=${req_vars[variable].value}\n`
    })

    fs.writeFileSync('.env', data, { flag: 'w', encoding: 'utf8' });
}

async function config() {
    const answers = await inquirer.prompt(prompts)
    Object.keys(answers).forEach((variable) => {
        req_vars[variable].value = answers[variable];
    });
    updateEnvFile()
}

module.exports.config = config