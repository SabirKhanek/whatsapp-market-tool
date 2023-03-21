const data_schema = {
    "products": [
        {
            "intent": "Buy/Sell",
            "name": "iphone",
            "type": "smartphone",
            "variants": [
                {
                    "name": "14 Pro Max",
                    "quantity": "100",
                    "condition": "Used/New/A++",
                    "brand": "Apple",
                    "tags": [
                        "iphone",
                        "256 GB",
                        "Red"
                    ],
                    "price": "price$",
                    "remarks": "Unlocked 256GB shipped to USA"
                }
            ]
        }
    ]
}

module.exports.data_schema = data_schema;