const fs = require('fs');

const schema = require('./data_schema').data_schema;


function getIntentAnalysisCommand(message) {
    message = "Text: \n\"" + message + "\"\n";

    const instructions = `Extract intent, product name, product type, variant, quantity, condition, tags, price, and specified qualities from text input if the intent is to buy or sell products. Return the result in JSON format following the given schema. If the intent is not related to buying(WTB i.e., WTB) or selling(WTB i.e., WTS), return "CODE400". WTB means the intent is for buy and WTS means intent is for sell. JSON SCHEMA:\n${JSON.stringify(schema)}`;

    return message.concat(instructions);
}

module.exports.getIntentAnalysisCmd = getIntentAnalysisCommand
