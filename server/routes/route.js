const router = require('express').Router();
const {
	home,
	createLinkToken,
	setAccessToken,
	saveTransactionEvery24H,
	getBankNames,
	saveBalanceInDB,
	getAllTransactionIn24h,
	getTotalBalanceDB,
} = require('../controllers/api.js');

router.get('/', home);
router.post('/create_link_token', createLinkToken);
router.post('/set_access_token', setAccessToken);
router.get('/save_transactions_24', saveTransactionEvery24H);
router.get('/get_bank_names', getBankNames);
router.get('/get_last_transactions', getAllTransactionIn24h);
router.get('/get_balance', saveBalanceInDB);
router.get('/get_total_balance', getTotalBalanceDB);

module.exports = router;
