const fs = require('fs');

const schema = require('./data_schema').data_schema;

// if (fs.existsSync('./data_schema.json')) {
//     const data = fs.readFileSync('./data_schema.json');
//     schema = JSON.parse(data);
// } else {
//     console.log('Please set the data_schema.json file')
//     process.exit(1)
// }

function getIntentAnalysisCommand(message) {
    message = "Text: \n\"" + message + "\"\n";

    const instructions = `Extract intent, product name, product type, variant, quantity, condition, tags, price, and specified qualities from text input if the intent is to buy or sell products. Return the result in JSON format following the given schema. If the intent is not related to buying or selling, return "CODE400". JSON SCHEMA:\n${JSON.stringify(schema)}`;

    return message.concat(instructions);
}

module.exports.getIntentAnalysisCmd = getIntentAnalysisCommand
