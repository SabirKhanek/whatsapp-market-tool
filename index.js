require('./src/configurator').config().then(() => {
    require('./app')
})