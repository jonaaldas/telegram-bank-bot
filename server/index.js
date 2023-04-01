const express = require('express');
const axios = require('axios');
require('dotenv').config();
const {
	Configuration,
	PlaidApi,
	Products,
	PlaidEnvironments,
} = require('plaid');
const util = require('util');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const app = express();
const moment = require('moment');
const CircularJSON = require('circular-json');
app.use(
	bodyParser.urlencoded({
		extended: false,
	})
);
app.use(bodyParser.json());
app.use(cors());
const port = 9000;

const connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'Jona1995!',
	database: 'bank_info',
});

connection.connect(function (err) {
	if (err) throw err;
});

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

// We store the access_token in memory - in production, store it in a secure
// persistent data store
let ACCESS_TOKEN = null;
let PUBLIC_TOKEN = null;
let ITEM_ID = null;

// PLAID_PRODUCTS is a comma-separated list of products to use when initializing
// Link. Note that this list must contain 'assets' in order for the app to be
// able to create and retrieve asset reports.
const PLAID_PRODUCTS = (
	process.env.PLAID_PRODUCTS || Products.Transactions
).split(',');

// PLAID_COUNTRY_CODES is a comma-separated list of countries for which users
// will be able to select institutions from.
const PLAID_COUNTRY_CODES = (process.env.PLAID_COUNTRY_CODES || 'US').split(
	','
);

const configuration = new Configuration({
	basePath: PlaidEnvironments[PLAID_ENV],
	baseOptions: {
		headers: {
			'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
			'PLAID-SECRET': PLAID_SECRET,
			'Plaid-Version': '2020-09-14',
		},
	},
});

const client = new PlaidApi(configuration);

app.get('/', (req, res) => {
	res.send('Hello World!');
});

// Create a link token with configs which we can then use to initialize Plaid Link client-side.
// See https://plaid.com/docs/#create-link-token
app.post('/api/create_link_token', function (request, response, next) {
	Promise.resolve()
		.then(async function () {
			const configs = {
				user: {
					// This should correspond to a unique id for the current user.
					client_user_id: 'user-id',
				},
				client_name: 'Plaid Quickstart',
				products: PLAID_PRODUCTS,
				country_codes: PLAID_COUNTRY_CODES,
				language: 'en',
			};
			const createTokenResponse = await client.linkTokenCreate(configs);
			response.json(createTokenResponse.data);
		})
		.catch(next);
});

// Exchange token flow - exchange a Link public_token for
// an API access_token
// https://plaid.com/docs/#exchange-token-flow
app.post('/api/set_access_token', function (request, response, next) {
	PUBLIC_TOKEN = request.body.data;
	Promise.resolve()
		.then(async function () {
			const tokenResponse = await client.itemPublicTokenExchange({
				public_token: PUBLIC_TOKEN,
			});

			// save data in a database link to user
			ACCESS_TOKEN = tokenResponse.data.access_token;
			ITEM_ID = tokenResponse.data.item_id;
			const request = {
				access_token: ACCESS_TOKEN,
			};
			const bankInfo = await client.itemGet(request);
			// 	connection.query(
			// 		`
			// 		INSERT INTO bank_info.bank_token (bank_name, access_token, item_id)
			// VALUES ('${title}', '${body}', ${id})
			// 		`
			// 	);
			let information = JSON.parse(CircularJSON.stringify(bankInfo));
			response.json({
				// the 'access_token' is a private token, DO NOT pass this token to the frontend in your production environment
				access_token: ACCESS_TOKEN,
				item_id: ITEM_ID,
				error: null,
				...information.data.item,
			});
		})
		.catch(next);
});

app.post('/api/transactions', async function (request, response, next) {
	Promise.resolve()
		.then(async function () {
			const request = {
				access_token: ACCESS_TOKEN,
				cursor: null,
			};
			const res = await client.transactionsSync(request);
			const data = res.data.added;
			let date = moment(new Date()).subtract(1, 'day').format('YYYY-MM-DD');
			let currentTransaction = data.filter(
				(transaction) => transaction.authorized_date === date
			);
			response.json(currentTransaction);
			// // Set cursor to empty to receive all historical updates
			// let cursor = null;

			// // New transaction updates since "cursor"
			// let added = [];
			// let modified = [];
			// // Removed transaction ids
			// let removed = [];
			// let hasMore = true;
			// // Iterate through each page of new transaction updates for item
			// while (hasMore) {
			// 	const request = {
			// 		access_token: ACCESS_TOKEN,
			// 		cursor: cursor,
			// 	};
			// 	const response = await client.transactionsSync(request);
			// 	const data = response.data;
			// 	// Add this page of results
			// 	added = added.concat(data.added);
			// 	modified = modified.concat(data.modified);
			// 	removed = removed.concat(data.removed);
			// 	hasMore = data.has_more;
			// 	// Update cursor to the next cursor
			// 	cursor = data.next_cursor;
			// 	// prettyPrintResponse(response);
			// }

			// const compareTxnsByDateAscending = (a, b) =>
			// 	(a.date > b.date) - (a.date < b.date);
			// // Return the 8 most recent transactions
			// const recently_added = [...added]
			// 	.sort(compareTxnsByDateAscending)
			// 	.slice(-8);
			// response.json(data);
		})
		.catch(next);
});

app.post('/api/accounts/get', function (request, response, next) {
	Promise.resolve()
		.then(async function () {
			const request = {
				access_token: ACCESS_TOKEN,
			};
			try {
				const res = await client.accountsGet(request);
				const accounts = res.data.accounts;
				response.json({
					accounts,
				});
			} catch (error) {
				// handle error
				console.log(error);
			}
		})
		.catch(next);
});

app.post('/api/item/get', function (request, response, next) {
	Promise.resolve().then(async function () {
		const request = {
			access_token: ACCESS_TOKEN,
		};
		try {
			const res = await client.itemGet(request);
			const item = res.data.item;
			const status = res.data.status;
			response.json(item);
		} catch (error) {
			// handle error
			console.log(error);
		}
	});
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
