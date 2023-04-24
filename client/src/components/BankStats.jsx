import axios from 'axios';
import React, { useEffect, useState } from 'react';

const BankStats = () => {
	const link = 'http://localhost:9000/api';
	const [bankBalances, setBankBalances] = useState([]);
	useEffect(() => {
		axios
			.get(`${link}/get_total_balance`)
			.then((balances) => setBankBalances(balances.data))
			.catch((e) => console.log(e));
	}, []);
	const totalBalance =
		bankBalances[0]?.total_checking + bankBalances[0]?.total_savings || 0;
	const totalDebt = bankBalances[0]?.total_credit || 0;
	return (
		<div className='stats shadow w-full'>
			<div className='stat place-items-center'>
				<div className='stat-title'>Total Cash</div>
				<div className='stat-value'>${totalBalance}</div>
			</div>

			<div className='stat place-items-center'>
				<div className='stat-title'>Debt</div>
				<div className='stat-value text-secondary'>${totalDebt}</div>
			</div>
		</div>
	);
};

export default React.memo(BankStats);
