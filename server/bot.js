const TelegramBot = require('node-telegram-bot-api');
const token = '6214228731:AAHQVURw1R39ndo221V2I8-nmAqRRuZOOQc';
const bot = new TelegramBot(token, { polling: true });
const groupId = '-957994995';
const cron = require('node-cron');
const {
	saveTransactionEvery24H,
	saveBalanceInDB,
} = require('./controllers/api.js');
const connection = require('./config/database');

const getLastSpendetureFromDb = async () => {
	return new Promise((resolve, reject) => {
		connection.query(
			`
        SELECT purchase_amount, last_purchases.date as date_spend, purchase_name, bank_accounts.bank_name as bank_name
        FROM last_purchases
        LEFT JOIN bank_accounts ON last_purchases.account_id = bank_accounts.account_id
        WHERE last_purchases.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY);
      `,
			(error, results, fields) => {
				if (error) {
					reject(error);
				} else {
					resolve(results);
				}
			}
		);
	});
};

const getTotalBalanceFromDB = () => {
	return new Promise((resolve, reject) => {
		connection.query(
			`
      SELECT 
      SUM(CASE WHEN bank_name LIKE '%checking%' THEN balance ELSE 0 END) AS total_checking,
      SUM(CASE WHEN bank_name LIKE '%saving%' THEN balance ELSE 0 END) AS total_savings,
      SUM(CASE WHEN bank_name LIkE '%credit%' THEN balance ELSE 0 END) AS total_credit
      FROM bank_balance;
      `,
			(error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			}
		);
	});
};

const getEachBankBalanceFromDB = () => {
	return new Promise((resolve, reject) => {
		connection.query(
			`
      SELECT bank_name, balance
      FROM bank_balance
      WHERE bank_balance.updated_at >= DATE_SUB(NOW(), INTERVAL 1 DAY);      
      `,
			(error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			}
		);
	});
};

const runJob = () => {
	let updatedBalanceDB = false;
	let updatedTransationsDB = false;
	let msg = '';
	let spendeture;
	let balance;
	let eachBalance;

	Promise.all([saveBalanceInDB(), saveTransactionEvery24H()])
		.then(([result1, result2]) => {
			updatedBalanceDB = result1;
			updatedTransationsDB = result2;

			if (updatedBalanceDB && updatedTransationsDB) {
				const promises = [
					getLastSpendetureFromDb(),
					getTotalBalanceFromDB(),
					getEachBankBalanceFromDB(),
				];

				Promise.all(promises)
					.then(([spend, bal, eachBal]) => {
						spendeture = spend
							.map(
								(row) =>
									`You Spent $${row.purchase_amount} on ${row.purchase_name}/${row.bank_name}`
							)
							.join('\n');

						if (spendeture.length === 0) {
							spendeture = 'You did not spend money Today 🥰';
						}

						balance = `
            Todays Total Balance
            Checking $${bal[0].total_checking}
            Savings $${bal[0].total_savings}
            Credit Balance $${bal[0].total_credit}
          `;

						eachBalance = eachBal
							.map((account) => {
								return `${account.bank_name} ${account.balance}`;
							})
							.join('\n');
						msg = `
          Hi Jonathan these are todays stats! 
            ${spendeture}
            ${balance}
            ${eachBalance}
          `;
						bot.sendMessage(groupId, msg);
					})
					.catch((error) => {
						console.log('Error while fetching data:', error);
					});
			}
		})
		.catch((error) => {
			updatedBalanceDB = false;
			updatedTransationsDB = false;
			console.log('Error while updating database:', error);
		});
};

cron.schedule('0 9 * * *', runJob);
