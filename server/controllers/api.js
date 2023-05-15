const {
	client,
	PLAID_PRODUCTS,
	PLAID_COUNTRY_CODES,
} = require('../config/plaid.js');
const connection = require('../config/database.js');
const PlanetScale = require('../config/planetScaleDB.js');
const moment = require('moment');
let ACCESS_TOKEN = null;
let PUBLIC_TOKEN = null;
let ITEM_ID = null;
let NAME = null;
let INSTITUTIONID = null;
let databaseName = 'bank_info';
let planetSacelDatabaseName = 'bank_bot';

const getBalance = async () => {
	const request = {
		access_token: ACCESS_TOKEN,
	};
	try {
		const response = await client.accountsBalanceGet(request);
		const accounts = response.data.accounts;
		if (accounts.length >= 1) {
			accounts.forEach((account) => {
				PlanetScale.query(
					`
					INSERT INTO ${planetSacelDatabaseName}.bank_balance (bank_name,balance, account_id)
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

const saveAllTransactionsDB = async () => {
	const transactionRequest = {
		access_token: ACCESS_TOKEN,
		cursor: null,
	};
	const plaidRes = await client.transactionsSync(transactionRequest);
	const data = plaidRes.data.added;
	let date = moment(new Date()).subtract(7, 'day').format('YYYY-MM-DD');
	let currentTransaction = data.filter((transaction) => {
		if (transaction.date == date) {
			return transaction;
		} else {
			console.log('No matching transactinos');
		}
	});
	currentTransaction.forEach((transaction) => {
		PlanetScale.query(
			`
				INSERT INTO ${planetSacelDatabaseName}.last_purchases (account_id, purchase_name, purchase_amount, date)
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

const getBankAccessTokens = () => {
	return new Promise((resolve, reject) => {
		PlanetScale.query(
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

module.exports = {
	home: (req, res) => {
		res.send('Hello World!!');
	},
	createLinkToken: async (req, res) => {
		try {
			const configs = {
				user: {
					client_user_id: 'user-id',
				},
				client_name: 'Plaid Quickstart',
				products: PLAID_PRODUCTS,
				country_codes: PLAID_COUNTRY_CODES,
				language: 'en',
			};
			const createTokenResponse = await client.linkTokenCreate(configs);
			res.json(createTokenResponse.data);
		} catch (error) {
			console.log(error);
		}
	},
	setAccessToken: async (req, res, next) => {
		PUBLIC_TOKEN = req.body.data;
		try {
			const { name, institution_id } = req.body.metadata.institution;
			const accountsPlaid = req.body.metadata.accounts;
			const tokenResponse = await client.itemPublicTokenExchange({
				public_token: PUBLIC_TOKEN,
			});
			ACCESS_TOKEN = tokenResponse.data.access_token;
			ITEM_ID = tokenResponse.data.item_id;
			NAME = name;
			INSTITUTIONID = institution_id;
			let institutionName = {
				NAME,
				INSTITUTIONID,
			};
			PlanetScale.query(
				`
					INSERT INTO ${planetSacelDatabaseName}.bank_token (bank_name, access_token, item_id, institution_id)
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
			accountsPlaid.forEach((account, index) => {
				PlanetScale.query(
					`
						INSERT INTO ${planetSacelDatabaseName}.bank_accounts (account_id, mask, name, subtype, type, bank_name) 
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
			saveAllTransactionsDB();
			getBalance();
		} catch (error) {
			console.log(error);
		}
	},
	saveTransactionEvery24H: async (req, res) => {
		try {
			const accessTokens = await getBankAccessTokens();

			const transactionPromises = accessTokens.map(async (accessToken) => {
				const transactionRequest = {
					access_token: accessToken.access_token,
					cursor: null,
				};
				const plaidRes = await client.transactionsSync(transactionRequest);
				return plaidRes.data.added;
			});

			const allTransactions = await Promise.all(transactionPromises);

			const flatArr = allTransactions.flat();

			const dayBefore = moment().subtract(1, 'days').format('YYYY-MM-DD');
			const newData = flatArr.filter((transaction) => {
				if (transaction.date == dayBefore) {
					return transaction;
				}
			});

			if (newData.length == 0) {
				console.log('You did not spend money yesterday');
				return true;
			}

			if (newData.length >= 1) {
				const promises = newData.map((transaction) => {
					return new Promise((resolve, reject) => {
						PlanetScale.query(
							`
        INSERT INTO ${planetSacelDatabaseName}.last_purchases (purchase_amount, date, purchase_name, account_id)
        VALUES ('${transaction.amount}', '${transaction.date}', '${transaction.merchant_name}', '${transaction.account_id}')
      `,
							(error, results) => {
								if (error) {
									reject(error);
								} else {
									resolve(results);
								}
							}
						);
					});
				});

				await Promise.all(promises);

				return true;
			}
		} catch (error) {
			console.log(error);
			return false;
		}

		return false;
	},
	// Define a function that returns a Promise
	getBankNames: async (req, res) => {
		try {
			const bankNames = await new Promise((resolve, reject) => {
				PlanetScale.query(
					'SELECT bank_name FROM bank_token',
					(err, rows, fields) => {
						if (err) reject(err);
						resolve(rows);
					}
				);
			});
			res.send(bankNames);
			// return bankNames;
		} catch (error) {
			console.log(error);
			res.status(500).send('Internal Server Error');
		}
	},
	getAllTransactionIn24h: async (req, res) => {
		try {
			PlanetScale.query(
				`
				SELECT
					bank_accounts.bank_name,
					bank_accounts.name,
					bank_accounts.account_id,
					last_purchases.purchase_amount,
					last_purchases.date,
					last_purchases.purchase_name
				FROM
					bank_accounts
					LEFT JOIN last_purchases ON last_purchases.account_id = bank_accounts.account_id
				WHERE
					last_purchases.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY);
			`,
				(err, rows, fields) => {
					if (err) throw err;
					res.send(rows);
				}
			);
		} catch (error) {
			console.log(error);
		}
	},
	// saveBalanceInDB: async (req, res) => {
	// 	try {
	// 		const accessTokens = await getBankAccessTokens();

	// 		const balancePromises = accessTokens.map(async (accessToken) => {
	// 			const balanceRequest = {
	// 				access_token: accessToken.access_token,
	// 			};
	// 			const plaidRes = await client.accountsBalanceGet(balanceRequest);

	// 			return plaidRes.data.accounts;
	// 		});

	// 		const allBalances = (await Promise.all(balancePromises)).flat();

	// 		if (allBalances.length >= 1) {
	// 			allBalances.map((account) => {
	// 				PlanetScale.query(
	// 					`
	// 			INSERT INTO ${planetSacelDatabaseName}.bank_balance (bank_name, balance, account_id)
	// 			VALUES ('${account.name}', '${account.balances.current}', '${account.account_id}')
	// 			ON DUPLICATE KEY UPDATE balance = VALUES(balance);
	// 				`,
	// 					(error, results) => {
	// 						if (error) {
	// 							console.log(error);
	// 						}
	// 					}
	// 				);
	// 			});

	// 		}
	// 	} catch (error) {
	// 		console.log(error);
	// 	}
	// },
	saveBalanceInDB: async (req, res) => {
		try {
			const accessTokens = await getBankAccessTokens();

			const balancePromises = accessTokens.map(async (accessToken) => {
				const balanceRequest = {
					access_token: accessToken.access_token,
				};
				const plaidRes = await client.accountsBalanceGet(balanceRequest);

				return plaidRes.data.accounts;
			});

			const allBalances = (await Promise.all(balancePromises)).flat();

			if (allBalances.length >= 1) {
				const promises = allBalances.map((account) => {
					return new Promise((resolve, reject) => {
						PlanetScale.query(
							`
            INSERT INTO ${planetSacelDatabaseName}.bank_balance (bank_name, balance, account_id)
            VALUES ('${account.name}', '${account.balances.current}', '${account.account_id}')
            ON DUPLICATE KEY UPDATE balance = VALUES(balance);
            `,
							(error, results) => {
								if (error) {
									reject(error);
								} else {
									resolve(results);
								}
							}
						);
					});
				});

				await Promise.all(promises);

				return true;
			}
		} catch (error) {
			console.log(error);
		}

		return false;
	},

	getTotalBalanceDB: async (req, res) => {
		try {
			PlanetScale.query(
				`
        SELECT 
          SUM(CASE WHEN bank_name LIKE '%checking%' THEN balance ELSE 0 END) AS total_checking,
          SUM(CASE WHEN bank_name LIKE '%saving%' THEN balance ELSE 0 END) AS total_savings,
          SUM(CASE WHEN bank_name LIkE '%credit%' THEN balance ELSE 0 END) AS total_credit
        FROM bank_balance;
        `,
				(error, results) => {
					if (error) {
						console.log(error);
					} else {
						res.json(results);
					}
				}
			);
		} catch (error) {
			console.log('🚀 ~ file: api.js:308 ~ getBalanceDB: ~ error:', error);
		}
	},
};
