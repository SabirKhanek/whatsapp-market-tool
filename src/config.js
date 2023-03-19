var TimeFilter = 24 * 60 * 60


module.exports.TimeFilter = TimeFilter

module.exports.updateFilter = (time) => {
    TimeFilter = time
}