import axios from 'axios';
import React, { useEffect, useState } from 'react';

const BankTransactions = () => {
	const [transactions, setTransactions] = useState([]);
	let link = 'http://localhost:9000/api';
	const getLastTransactionsFromDB = async () => {
		console.log('Fetching last transactions...');
		await axios
			.get(`${link}/get/last-transactions`)
			.then((data) => setTransactions(data.data))
			.catch((e) => console.log(e));
	};
	useEffect(() => {
		getLastTransactionsFromDB();
	}, []);
	return (
		<div className='overflow-x-auto'>
			<table className='table w-full'>
				<thead>
					<tr>
						<th></th>
						<th>Bank</th>
						<th>Account</th>
						<th>What?</th>
						<th>Amount</th>
					</tr>
				</thead>
				<tbody>
					{transactions.map((transaction, index) => {
						return (
							<tr key={index}>
								<th>{index + 1}</th>
								<td>{transaction.bank_name}</td>
								<td>{transaction.name}</td>
								<td>{transaction.purchase_name}</td>
								<td>${transaction.purchase_amount}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

export default React.memo(BankTransactions);
