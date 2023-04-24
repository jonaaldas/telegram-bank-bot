// @ts-nocheck
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const api = require('./routes/route');
app.use(
	bodyParser.urlencoded({
		extended: false,
	})
);
app.use(bodyParser.json());
app.use(cors());
const port = 9000;

app.use('/api', api);

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
