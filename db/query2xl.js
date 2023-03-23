const { db } = require('./db');
const ExcelJS = require('exceljs');
let { TimeFilter } = require('../src/config');

function generateProductData(time_filter) {
    const query = `
        SELECT 
        product.intent AS Intent,
        product.name AS ProductName,
        product.type AS ProductType,
        variant.name AS Variant,
        variant.brand AS Brand,
        variant.quantity AS Quantity,
        variant.condition AS Condition,
        variant.price AS Price,
        variant.remarks AS Remarks,
        chat.chatName AS ChatName,
        chat.chatMessage AS Message,
        chat.chatMessageAuthor AS Author,
        datetime(chat.chatMessageTime, 'unixepoch') AS message_time,
        (
            SELECT group_concat(Tag.tag_name, ', ') 
            FROM Tag 
            JOIN TagVariant ON TagVariant.tag_id = Tag.tag_id 
            WHERE TagVariant.variant_id = variant.variant_id 
        ) AS Tags
        FROM 
        Chat chat
        JOIN 
        Product product ON chat.id = product.chatId
        JOIN 
        Variant variant ON product.prd_id = variant.prd_id
        WHERE chat.chatMessageTime > ?
        `
        ;

    let timeFrom = (new Date().getTime()) / 1000;
    timeFrom = timeFrom - (time_filter ? time_filter : 3600);

    const getData = db.prepare(query);
    const data = getData.all(timeFrom);

    return data
}

async function generateProductExcel(time_filter = (new Date().getTime() / 1000)) {
    const data = generateProductData(time_filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // Define headers for the worksheet
    const workbook_columns = [
        { header: 'Intent', key: 'intent' },
        { header: 'Product Name', key: 'productName' },
        { header: 'Product Type', key: 'productType' },
        { header: 'Variant', key: 'variant' },
        { header: 'Brand', key: 'brand' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Condition', key: 'condition' },
        { header: 'Price', key: 'price' },
        { header: 'Remarks', key: 'remarks' },
        { header: 'Message', key: 'message' },
        { header: 'Chat Name', key: 'chatName' },
        { header: 'Author', key: 'author' },
        { header: 'Message Time', key: 'messageTime' },
        { header: 'Tags', key: 'tags' },
    ];

    worksheet.columns = workbook_columns.map(column => {
        return { ...column, width: undefined };
    });

    // Set the style of the column headers to blue
    worksheet.getRow(1).eachCell((cell, columnNumber) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' }, // blue
        };
        cell.font = {
            color: { argb: 'FFFFFFFF' }, // white
        }
    });

    // Add data to the worksheet
    data.forEach(row => {
        worksheet.addRow({
            intent: row.Intent,
            productName: row.ProductName,
            productType: row.ProductType,
            variant: row.Variant,
            brand: row.Brand,
            quantity: row.Quantity,
            condition: row.Condition,
            price: row.Price,
            remarks: row.Remarks,
            message: row.Message,
            chatName: row.ChatName,
            author: row.Author,
            messageTime: row.message_time,
            tags: row.Tags,
        });
    });

    data.forEach(row => {
        Object.keys(row).forEach((key, index) => {
            const column = worksheet.getColumn(index + 1); // Excel columns are 1-indexed
            const cellWidth = (row[key] && row[key].toString().length + 2) || 10; // add 2 for padding
            column.width = Math.max((column.width || 0), cellWidth); // take the max of the current width and the cell width
        });
    });


    worksheet.eachRow((row, rowNumber) => {
        const intentCell = row.getCell('intent');
        const text = intentCell.text.toString().toLowerCase()
        if (text.includes('buy')) {
            intentCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF92D050' }, // green
            };
        } else if (text.includes('sell')) {
            intentCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF0000' }, // red
            };
        }
    });



    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const filename = `./db/products_${timestamp}.xlsx`;


    const file_path = filename;

    // Save the workbook to a file
    await workbook.xlsx.writeFile(file_path)


    return file_path;
}


function generatePotentialPairsData(time_filter) {
    const query =
        `SELECT mergestr(b.name, bv.name) as buy_prd,
    mergestr(s.name, sv.name) as sell_prd,
    bv.brand as buy_brand,
    sv.brand as sell_brand,
    (
        SELECT group_concat(Tag.tag_name, ', ') 
        FROM Tag 
        JOIN TagVariant ON TagVariant.tag_id = Tag.tag_id 
        WHERE TagVariant.variant_id = bv.variant_id 
    ) AS buyer_tags,
    (
        SELECT group_concat(Tag.tag_name, ', ') 
        FROM Tag 
        JOIN TagVariant ON TagVariant.tag_id = Tag.tag_id 
        WHERE TagVariant.variant_id = sv.variant_id 
    ) AS seller_tags,
    similarity(
        mergestr(b.name, bv.name),
        mergestr(s.name, sv.name)
    ) as name_similarity,
    bc.chatMessage as buyer_message,
    sc.chatMessage as seller_message,
    bc.chatName as buyer_chat_name,
    sc.chatName as seller_chat_name,
    bc.chatMessageAuthor as buyer_message_author,
    sc.chatMessageAuthor as seller_message_author,
    datetime(bc.chatMessageTime, 'unixepoch') AS seller_message_time,
    datetime(sc.chatMessageTime, 'unixepoch') AS buyer_message_time
    FROM Product b
    JOIN Product s ON s.intent = 'Sell'
    JOIN Variant bv ON bv.prd_id = b.prd_id
    JOIN Variant sv ON sv.prd_id = s.prd_id
    JOIN Chat bc ON bc.id = b.chatId
    JOIN Chat sc ON sc.id = s.chatId
    WHERE b.intent = 'Buy'
    AND similarity(b.type, s.type) >= 0.5
    AND similarity(
        mergestr(b.name, bv.name),
        mergestr(s.name, sv.name)
    ) >= 0.2
    AND similarity(bv.brand, sv.brand) >= 0.5
    AND bc.chatMessageTime >= ?
    AND sc.chatMessageTime >= ?
    ORDER BY name_similarity DESC;
    `
    let timeFrom = (new Date().getTime()) / 1000;
    timeFrom = timeFrom - (time_filter ? time_filter : timeFrom);

    const getData = db.prepare(query);
    const data = getData.all(timeFrom, timeFrom);

    return data
}

async function generatePotentialPairsExcel(time_filter = (new Date().getTime() / 1000)) {
    const data = generatePotentialPairsData(time_filter);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // Define headers for the worksheet
    const workbook_columns = [
        { header: 'Buy Product', key: 'buy_prd' },
        { header: 'Sell Product', key: 'sell_prd' },
        { header: 'Buy Brand', key: 'buy_brand' },
        { header: 'Sell Brand', key: 'sell_brand' },
        { header: 'Buy product Tags', key: 'buyer_tags' },
        { header: 'Sell product Tags', key: 'seller_tags' },
        { header: ' Names Similarity Score', key: 'name_similarity' },
        { header: 'Buyer Message', key: 'buyer_message' },
        { header: 'Seller Message', key: 'seller_message' },
        { header: 'Buyer Chat Name', key: 'buyer_chat_name' },
        { header: 'Seller Chat Name', key: 'seller_chat_name' },
        { header: 'Buyer Info', key: 'buyer_message_author' },
        { header: 'Seller Info', key: 'seller_message_author' },
        { header: 'Buyer Message Time', key: 'buyer_message_time' },
        { header: 'Seller Message Time', key: 'seller_message_time' },
    ];

    worksheet.columns = workbook_columns.map(column => {
        return { ...column, width: undefined };
    });

    // Set the style of the column headers to blue
    worksheet.getRow(1).eachCell((cell, columnNumber) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0070C0' }, // blue
        };
        cell.font = {
            color: { argb: 'FFFFFFFF' }, // white
        }
    });

    // Add data to the worksheet
    data.forEach(row => {
        worksheet.addRow({
            buy_prd: row.buy_prd,
            sell_prd: row.sell_prd,
            buy_brand: row.buy_brand,
            sell_brand: row.sell_brand,
            buyer_tags: row.buyer_tags,
            seller_tags: row.seller_tags,
            name_similarity: row.name_similarity,
            buyer_message: row.buyer_message,
            seller_message: row.seller_message,
            buyer_chat_name: row.buyer_chat_name,
            seller_chat_name: row.seller_chat_name,
            buyer_message_author: row.buyer_message_author,
            seller_message_author: row.seller_message_author,
            buyer_message_time: row.buyer_message_time,
            seller_message_time: row.seller_message_time,
        });
    });

    data.forEach(row => {
        Object.keys(row).forEach((key, index) => {
            const column = worksheet.getColumn(index + 1); // Excel columns are 1-indexed
            const cellWidth = (row[key] && row[key].toString().length + 2) || 10; // add 2 for padding
            const desired_width = Math.max((column.width || 0), cellWidth);
            column.width = (desired_width >= 60 ? 60 : desired_width); // take the max of the current width and the cell width
        });
    });


    worksheet.eachRow((row, rowNumber) => {
        const name_similarity = row.getCell('name_similarity');
        const text = name_similarity.text;
        if (text >= 0.5) {
            name_similarity.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF92D050' }, // green
            };
        } else if (text >= 0.3) {
            name_similarity.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF99' }, // yellowish
            };
        } else if (text >= 0.2) {
            name_similarity.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF6666' },
            }
        }
    });



    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const filename = `./db/potential_buysell_pairs_${timestamp}.xlsx`;


    const file_path = filename;

    // Save the workbook to a file
    await workbook.xlsx.writeFile(file_path)

    return file_path;
}

module.exports.getPotentialPairsPath = generatePotentialPairsExcel;


module.exports.getExcelPath = generateProductExcel;
