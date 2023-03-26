module.exports = {
	HOST: 'localhost',
	USER: 'root',
	PASSWORD: 'Jona1995!',
	DB: 'bank_info',
	dialect: 'mysql',
	pool: {
		max: 5,
		min: 0,
		acquire: 30000,
		idle: 10000,
	},
};
