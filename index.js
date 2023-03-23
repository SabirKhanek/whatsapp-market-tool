const { spawn } = require('child-process-promise');

function installPipPackages() {
    console.log('Installing pip packages...')
    const pipSpawn = spawn('pip', ['install', 'numpy', 'pandas', 'joblib', 'scipy', 'scikit-learn', 'nltk'], { cwd: './intent-classifier' });
    const pipSubprocess = pipSpawn.childProcess;
    new Promise((resolve, reject) => {
        let result = '';
        pipSubprocess.stdout.on('data', (data) => {
            result += data;
        });
        pipSubprocess.stdout.on('close', () => {
            resolve(result);
        });
        pipSubprocess.on('error', (err) => {
            console.log(err)
            reject(err);
        });
    }).then((result) => {
        console.log(result);
    }).catch((err) => {
        console.log(err)
    });
}



require('./src/configurator').config().then(() => {
    require('dotenv').config()
    if (process.env.deployment && process.env.deployment === 'server') {
        installPipPackages()
    }
    require('./app')
})