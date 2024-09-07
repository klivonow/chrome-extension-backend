const app = require('./app');
const config = require('../config/index');

const PORT = config.port;

app.listen(PORT, () => {
    console.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});