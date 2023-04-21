// @ts-nocheck
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import './App.css';
import BankCard from './components/BankCard';
import BankStats from './components/BankStats';
import BankTransactions from './components/BankTransactions';

function App() {
	const [token, setToken] = useState('');
	const [tranReady, setTranReady] = useState(false);
	const [banks, setBanks] = useState([]);
	let link = 'http://localhost:9000/api';

	const generateLinkToken = async () => {
		const response = await fetch(
			'http://localhost:9000/api/create_link_token',
			{
				method: 'POST',
			}
		);
		const data = await response.json();
		setToken(data.link_token);
	};

	const onSuccess = async (token, metadata) => {
		try {
			await axios.post('http://localhost:9000/api/set_access_token', {
				data: token,
				metadata: metadata,
			});
		} catch (error) {
			console.log('There has been an error');
		}
	};

	const init = () => {
		// getLastTransactionsFromDB();
		saveLast24hTransactionIntoDB();
	};

	const getBankNameFromDB = async () => {
		let { data } = await axios.get(`${link}/get/bankInformation`);
		setBanks(data);
	};

	const saveLast24hTransactionIntoDB = async () => {
		// gets all transactions from the last day and all balances for the last 24H
		axios
			.get(`${link}/get/allInformation`)
			.then((res) => console.log(res))
			.catch((error) => console.log(error));
	};

	let isOauth = false;
	const config = {
		token: token,
		onSuccess,
	};

	const { open, ready } = usePlaidLink(config);
	useEffect(() => {
		generateLinkToken();
		open();
	}, []);

	useEffect(() => {
		getBankNameFromDB();
	}, [banks]);

	return (
		<div className='flex flex-col items-center space-y-12'>
			<div className='md:w-3/4 lg:w-1/2'>
				<div className='flex flex-row w-full justify-center'>
					<button
						type='button'
						className='btn bg-primary text-xs mr-3'
						onClick={() => open()}
						disabled={!ready}
					>
						Connect a bank account
					</button>

					<button
						type='button'
						className='btn btn-secondary'
						onClick={() => init()}
					>
						Get last Transactions
					</button>
				</div>

				<BankCard bankName={{ banks }} />
				<BankStats />
				<BankTransactions />
			</div>
		</div>
	);
}

export default App;
