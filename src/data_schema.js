const data_schema = {
    "products": [
        {
            "intent": "Buy/Sell",
            "name": "iphone",
            "type": "smartphone",
            "variants": [
                {
                    "name": "256 GB",
                    "quantity": "100",
                    "condition": "Used/New/A++",
                    "brand": "Apple",
                    "tags": [
                        "iphone",
                        "256 GB",
                        "Red"
                    ],
                    "price": "price$",
                    "remarks": "Ready To Ship"
                }
            ]
        }
    ]
}

module.exports.data_schema = data_schema;