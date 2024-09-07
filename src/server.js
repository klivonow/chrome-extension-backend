const app = require('./app');
// const config = require('../config');
// const logger=require('./utils')

const PORT = 8080;

app.listen(PORT, () => {
    console.info(`Server running on port ${PORT}`);
});