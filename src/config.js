var TimeFilter = 24 * 60 * 60
var newMessageInterval = 60 * 15

module.exports.TimeFilter = {
    getTime: () => {
        return TimeFilter
    },
    setTime: (time) => {
        TimeFilter = time
    }
}

module.exports.newMessageInterval = {
    getTime: () => {
        return newMessageInterval
    },
    setTime: (time) => {
        newMessageInterval = time
    }
}
