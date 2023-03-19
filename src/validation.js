const Joi = require('joi')

const variant = Joi.object({
    name: Joi.string().allow(""),
    quantity: Joi.alternatives().try(Joi.number(), Joi.string().allow("")),
    condition: Joi.string().allow(""),
    brand: Joi.string().allow(""),
    tags: Joi.array().items(Joi.string()),
    price: Joi.alternatives().try(Joi.number(), Joi.string().allow("")),
    remarks: Joi.string().allow("")
})

const product = Joi.object({
    intent: Joi.string().valid('Buy', 'Sell').required(),
    name: Joi.string().required().invalid('-'),
    type: Joi.string().required().allow(''),
    variants: Joi.array().items(variant)
})

const dataSchemaJoi = Joi.object({
    products: Joi.array().items(product).min(1)
})


module.exports.validateIntent = dataSchemaJoi