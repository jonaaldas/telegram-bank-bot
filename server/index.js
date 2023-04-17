// @ts-nocheck
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
			const { name, institution_id } = request.body.metadata.institution;
			const accountsPlaid = request.body.metadata.accounts;
			const tokenResponse = await client.itemPublicTokenExchange({
				public_token: PUBLIC_TOKEN,
			});
			ACCESS_TOKEN = tokenResponse.data.access_token;
			ITEM_ID = tokenResponse.data.item_id;
			NAME = name;
			INSTITUTIONID = institution_id;
			institutionName = {
				NAME,
				INSTITUTIONID,
			};

			// save bank information in DATABASE
			connection.query(
				`
					INSERT INTO bank_info.bank_token (bank_name, access_token, item_id, institution_id)
					VALUES ('${NAME}', '${ACCESS_TOKEN}', '${ITEM_ID}', '${INSTITUTIONID}')
					ON DUPLICATE KEY UPDATE access_token=VALUES(access_token), item_id=VALUES(item_id), institution_id=VALUES(institution_id)
				`,
				(error, results) => {
					if (error) {
						if (error.code === 'ER_DUP_ENTRY') {
							console.log('Error: Duplicate entry');
						} else {
							console.log(`Error: ${error}`);
						}
					} else {
						console.log('Accounts Inserted successfully');
					}
				}
			);

			// Save each account information in the DB
			accountsPlaid.forEach((account) => {
				connection.query(
					`
						INSERT INTO bank_info.bank_accounts (account_id, mask, name, subtype, type, bank_name) 
						VALUES ('${account.id}', '${account.mask}', '${account.name}', '${account.subtype}', '${account.type}', '${institutionName.NAME}')
					`,
					(error, results) => {
						if (error) {
							if (error.code === 'ER_DUP_ENTRY') {
								console.log('Error: Duplicate entry');
							} else {
								console.log(`Error: ${error}`);
							}
						} else {
							console.log('Bank token inserted successfully');
						}
					}
				);
			});

			// save all trasnaction from the las 24h in the database
			saveTranToDB(institutionName);
			// get balance
			getBalance();
		})
		.catch(next);
});

// get bank balances of accounts and add to data base as soon as access token is created
const getBalance = async () => {
	const request = {
		access_token: ACCESS_TOKEN,
	};
	try {
		const response = await client.accountsBalanceGet(request);
		const accounts = response.data.accounts;
		if (accounts.length >= 1) {
			accounts.forEach((account) => {
				connection.query(
					`
					INSERT INTO bank_info.bank_balance (bank_name,balance, account_id)
					VALUES('${account.name}','${account.balances.current}', '${account.account_id}')
					ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance);
					`,
					(error, results) => {
						if (error) {
							if (error.code === 'ER_DUP_ENTRY') {
								console.log('Error: Duplicate entry');
							} else {
								console.log(`Error: ${error}`);
							}
						} else {
							console.log('Bank balances have been saved successfully');
						}
					}
				);
			});
		}
	} catch (error) {
		// handle error
		console.log(error);
	}
};

// save transactions into the data base
const saveTranToDB = async (institutionName) => {
	const transactionRequest = {
		access_token: ACCESS_TOKEN,
		cursor: null,
	};
	const plaidRes = await client.transactionsSync(transactionRequest);
	const data = plaidRes.data.added;
	let date = moment(new Date()).subtract(2, 'day').format('YYYY-MM-DD');

	let currentTransaction = data.filter((transaction) => {
		if (transaction.date == date) {
			return transaction;
		} else {
			console.log('No matching transactinos');
		}
	});

	currentTransaction.forEach((transaction) => {
		connection.query(
			`
				INSERT INTO bank_info.last_purchases (account_id, purchase_name, purchase_amount, date)
				VALUES ('${transaction.account_id}', '${transaction.merchant_name}', '${transaction.amount}', '${transaction.date}')
			`,
			(error, results) => {
				if (error) {
					console.log(error);
				} else {
					console.log('Transactions inserted successfully');
				}
			}
		);
	});
};

// get access tokens from BD
const getBankAccessTokens = () => {
	return new Promise((resolve, reject) => {
		connection.query(
			'SELECT access_token FROM bank_token',
			(err, rows, fields) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			}
		);
	});
};

// save transaction every 24h for every account
app.get('/api/get/allInformation', async function (req, res, next) {
	console.log('I am running all informaiton');
	try {
		const accessTokens = await getBankAccessTokens();

		// Create an array of promises for all the transactionsSync() calls
		const transactionPromises = accessTokens.map(async (accessToken) => {
			const transactionRequest = {
				access_token: accessToken.access_token,
				cursor: null,
			};
			const plaidRes = await client.transactionsSync(transactionRequest);
			return plaidRes.data.added;
		});

		// Wait for all the promises to resolve before continuing
		const allTransactions = await Promise.all(transactionPromises);

		// Combine all the data into a single array
		const flatArr = allTransactions.flat();

		// Filter the data based on the authorized_date for the last 30 days
		const dayBefore = moment().subtract(1, 'days').format('YYYY-MM-DD');
		const newData = flatArr.filter((transaction) => {
			if (transaction.date == dayBefore) {
				return transaction;
			}
		});

		if (newData.length == 0) {
			console.log('You did not spend money yesterday');
			return;
		}
		// save last transaction to the db
		if (newData.length >= 1) {
			newData.forEach((transaction) => {
				connection.query(
					`
						INSERT INTO bank_info.last_purchases (purchase_amount, date, purchase_name, account_id)
						VALUES ('${transaction.amount}', '${transaction.date}', '${transaction.merchant_name}', '${transaction.account_id}')
					`,
					(error, results) => {
						if (error) {
							console.log(error);
						} else {
							console.log('24H transactions added');
						}
					}
				);
			});
		}

		// res.json(newData);
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: 'Internal Server Error' });
	}
});

// get bank names
app.get(`/api/get/bankInformation`, async function (req, res, next) {
	try {
		connection.query(
			'SELECT bank_name FROM bank_token',
			(err, rows, fields) => {
				if (err) throw err;
				res.send(rows);
			}
		);
	} catch (error) {
		console.log(error);
		console.log('This is a bankInformation');
	}
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
